// supabase/functions/discord-bot/index.ts
// Edge Function: Discord Bot — creates private transaction channels
//
// Endpoints:
//   POST /discord-bot/create-channel  — Middleman creates a private channel for the transaction
//   POST /discord-bot/webhook          — Discord webhook events
//
// Required env vars:
//   DISCORD_BOT_TOKEN     — Bot token
//   DISCORD_GUILD_ID      — RaidStore server ID
//   DISCORD_CATEGORY_ID   — (optional) Category ID for transaction channels

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISCORD_API = "https://discord.com/api/v10";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface TxData {
  id: string; amount_usd: number; buyer_id: string; middleman_id: string; listing_id: string;
  listing?: { game: string; platform: string; seller_id: string; seller?: { discord_id: string; discord_username: string } };
  buyer?: { discord_id: string; discord_username: string };
  middleman?: { discord_id: string; discord_username: string };
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  // Supabase edge functions receive requests at /functions/v1/discord-bot
  const isCreateChannel = url.pathname.endsWith("/create-channel");
  const isWebhook = url.pathname.endsWith("/webhook");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
    }});
  }

  try {
    if ((isCreateChannel || !isWebhook) && req.method === "POST") return await handleCreateChannel(req);
    if (isWebhook && req.method === "POST") return await handleWebhook(req);
    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("discord-bot error:", err);
    return json({ error: String(err) }, 500);
  }
});

// ─── POST /create-channel ───
async function handleCreateChannel(req: Request) {
  const { transaction_id } = await req.json();
  if (!transaction_id) return json({ error: "transaction_id required" }, 400);

  const BOT = Deno.env.get("DISCORD_BOT_TOKEN");
  const GUILD = Deno.env.get("DISCORD_GUILD_ID");
  if (!BOT || !GUILD) return json({ error: "Bot not configured" }, 500);

  // 1. Fetch transaction with all participant Discord IDs
  const { data: tx, error: txErr } = await supabase.from("transactions").select(`
    id, amount_usd, buyer_id, middleman_id, listing_id,
    listing:listings!inner(game, platform, seller_id,
      seller:profiles!listings_seller_id_fkey(discord_id, discord_username)),
    buyer:profiles!transactions_buyer_id_fkey(discord_id, discord_username),
    middleman:profiles!transactions_middleman_id_fkey(discord_id, discord_username)
  `).eq("id", transaction_id).single();

  if (txErr || !tx) return json({ error: "Transaction not found" }, 404);
  const t = tx as unknown as TxData;

  // 2. Check existing channel
  const { data: exist } = await supabase.from("discord_invites")
    .select("channel_id, invite_url").eq("transaction_id", transaction_id).maybeSingle();

  if (exist?.channel_id) {
    const fresh = await makeInvite(BOT, exist.channel_id);
    return json({ invite_url: fresh || exist.invite_url, channel_id: exist.channel_id });
  }

  // 3. Get Discord IDs (optional — channel still created if some are missing)
  const buyerDid = t.buyer?.discord_id || null;
  const sellerDid = (t.listing as any)?.seller?.discord_id || null;
  const mmDid = t.middleman?.discord_id || null;
  const buyerName = t.buyer?.discord_username || t.buyer?.discord_id || "Buyer";
  const sellerName = (t.listing as any)?.seller?.discord_username || (t.listing as any)?.seller?.discord_id || "Seller";
  const mmName = t.middleman?.discord_username || t.middleman?.discord_id || "Middleman";

  // 4. Create private channel
  const shortId = transaction_id.slice(0, 6);
  const game = (t.listing?.game || "tx").replace(/[^a-zA-Z0-9-]/g, "-");
  const name = `tx-${shortId}-${game}`.slice(0, 100).toLowerCase();
  const catId = Deno.env.get("DISCORD_CATEGORY_ID");

  // Build channel body — simple, no permission overwrites
  const channelBody: Record<string, unknown> = {
    name,
    type: 2, // GUILD_VOICE (no topic for voice channels)
  };
  if (catId) channelBody.parent_id = catId;

  const ch = await fetch(`${DISCORD_API}/guilds/${GUILD}/channels`, {
    method: "POST",
    headers: { Authorization: `Bot ${BOT}`, "Content-Type": "application/json" },
    body: JSON.stringify(channelBody),
  });

  if (!ch.ok) {
    const txt = await ch.text();
    console.error("Channel creation failed:", ch.status, txt);
    // Return the actual Discord error for debugging
    let discordMsg = txt;
    try { const parsed = JSON.parse(txt); discordMsg = parsed.message || txt; } catch {}
    return json({
      error: `Discord API error (${ch.status}): ${discordMsg}`,
      hint: "Make sure the bot has 'Manage Channels' permission in your server.",
    }, 500);
  }

  const channel = await ch.json();

  // 5. Invite link
  const invite = await makeInvite(BOT, channel.id);

  // 6. Store — no welcome embed (voice channels don't support messages)
  await supabase.from("discord_invites").upsert({
    transaction_id,
    invite_code: invite?.split("/").pop() || channel.id,
    invite_url: invite || `https://discord.com/channels/${GUILD}/${channel.id}`,
    guild_id: GUILD,
    channel_id: channel.id,
    created_by: t.middleman_id,
  }, { onConflict: "transaction_id" });

  await supabase.from("transactions").update({
    discord_channel_id: channel.id,
    status: "channel_created",
  }).eq("id", transaction_id);

  return json({ channel_name: name, channel_id: channel.id, invite_url: invite });
}

// ─── POST /webhook ───
async function handleWebhook(req: Request) {
  const body = await req.json();
  if (body.type === "PING") return json({ type: 1 });
  return json({ received: true });
}

// ─── Helper ───
async function makeInvite(token: string, channelId: string): Promise<string | null> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/invites`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ max_age: 0, max_uses: 0, unique: true }),
  });
  if (!res.ok) { console.error("Invite failed:", await res.text()); return null; }
  const d = await res.json();
  return `https://discord.gg/${d.code}`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
