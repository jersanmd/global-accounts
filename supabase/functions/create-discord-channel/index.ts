// Supabase Edge Function: create-discord-channel
// Creates a private Discord channel and invites buyer, seller, middleman.
// Called by the middleman from their dashboard.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function discordApi(path: string, options: RequestInit = {}) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API error (${res.status}): ${body}`);
  }
  return res.json();
}

serve(async (req: Request) => {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing transactionId" }),
        { status: 400 }
      );
    }

    // Get transaction with participant info
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select(
        "*, buyer:profiles!transactions_buyer_id_fkey(discord_id), listing:listings(seller_id)"
      )
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
      });
    }

    // Get seller's Discord ID
    const { data: seller, error: sellerError } = await supabase
      .from("profiles")
      .select("discord_id")
      .eq("id", (tx.listing as unknown as { seller_id: string }).seller_id)
      .single();

    if (sellerError) {
      return new Response(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });
    }

    // Get middleman's Discord ID
    const { data: mm, error: mmError } = await supabase
      .from("profiles")
      .select("discord_id")
      .eq("id", tx.middleman_id)
      .single();

    const buyerDiscordId = (
      tx.buyer as unknown as { discord_id: string | null }
    ).discord_id;
    const sellerDiscordId = (seller as { discord_id: string | null }).discord_id;
    const mmDiscordId = (mm as { discord_id: string | null } | null)?.discord_id;

    // Create private channel
    const channel = await discordApi(
      `/guilds/${DISCORD_GUILD_ID}/channels`,
      {
        method: "POST",
        body: JSON.stringify({
          name: `transaction-${transactionId.slice(0, 8)}`,
          type: 0, // text channel
          permission_overwrites: [
            {
              id: DISCORD_GUILD_ID, // @everyone
              type: 0,
              deny: "1024", // VIEW_CHANNEL
            },
            ...(buyerDiscordId
              ? [{ id: buyerDiscordId, type: 1, allow: "1024" }]
              : []),
            ...(sellerDiscordId
              ? [{ id: sellerDiscordId, type: 1, allow: "1024" }]
              : []),
            ...(mmDiscordId
              ? [{ id: mmDiscordId, type: 1, allow: "1024" }]
              : []),
          ],
        }),
      }
    );

    // Save channel ID to transaction
    await supabase
      .from("transactions")
      .update({
        discord_channel_id: channel.id,
        status: "channel_created",
      })
      .eq("id", transactionId);

    return new Response(
      JSON.stringify({ channelId: channel.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-discord-channel error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500 }
    );
  }
});
