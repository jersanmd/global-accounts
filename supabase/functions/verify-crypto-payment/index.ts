import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { listingId, amountUsd, buyerId, quantity, txHash, network, test } = await req.json();
    if (!listingId || !amountUsd || !buyerId || (!test && !txHash)) {
      return json({ error: "Missing required fields" }, 400);
    }

    const { data: listing } = await supabase.from("listings").select("id, status").eq("id", listingId).single();
    if (!listing || listing.status !== "active") {
      return json({ error: "Listing not available" }, 400);
    }

    const hash = txHash || `test-${Date.now()}`;
    const detectedNetwork = network || "bsc";

    // If not test mode, verify via block explorers
    if (!test) {
      const ethAddr = Deno.env.get("PLATFORM_USDC_ADDRESS") ?? "";
      const bscAddr = Deno.env.get("PLATFORM_BSC_ADDRESS") ?? "";
      const tronAddr = Deno.env.get("PLATFORM_TRON_ADDRESS") ?? "";
      const klaytnAddr = Deno.env.get("PLATFORM_KLAYTN_ADDRESS") ?? "";
      const etherscanKey = Deno.env.get("ETHERSCAN_API_KEY") ?? "";
      if (!etherscanKey) {
        return json({ verified: false, error: "Etherscan API key not configured" }, 500);
      }

      let verified = false;
      // Try Etherscan
      if (!verified && ethAddr && etherscanKey) {
        const res = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${ethAddr}&apikey=${etherscanKey}&sort=desc&page=1&offset=20`);
        const data = await res.json();
        if (data.status === "1") verified = data.result.some((t: any) => t.hash.toLowerCase() === hash.toLowerCase());
      }
      // Try BscScan
      if (!verified && bscAddr && etherscanKey) {
        const res = await fetch(`https://api.bscscan.com/api?module=account&action=txlist&address=${bscAddr}&apikey=${etherscanKey}&sort=desc&page=1&offset=20`);
        const data = await res.json();
        if (data.status === "1") verified = data.result.some((t: any) => t.hash.toLowerCase() === hash.toLowerCase());
      }
      // Try Tron
      if (!verified && tronAddr) {
        const res = await fetch(`https://api.trongrid.io/v1/accounts/${tronAddr}/transactions/trc20?limit=20`);
        const data = await res.json();
        if (data.data) verified = data.data.some((t: any) => t.transaction_id?.toLowerCase() === hash.toLowerCase());
      }
      // Try Klaytn
      if (!verified && klaytnAddr) {
        const res = await fetch(`https://klaytnscope.com/api/accounts/${klaytnAddr}/txs?size=20`);
        const data = await res.json();
        if (data.result) verified = data.result.some((t: any) => t.txHash?.toLowerCase() === hash.toLowerCase());
      }

      if (!verified) {
        return json({ verified: false, error: "Transaction not found. Wait 1-2 minutes and try again." });
      }
    }

    const { data: tx, error: createError } = await supabase
      .from("transactions")
      .insert({
        listing_id: listingId, buyer_id: buyerId, amount_usd: amountUsd,
        quantity: quantity ?? 1, status: "paid", payment_method: "crypto",
        crypto_tx_hash: hash, crypto_currency: "USDC", crypto_network: detectedNetwork,
      })
      .select("id").single();

    if (createError) {
      return json({ error: "DB: " + createError.message, code: createError.code }, 500);
    }
    if (!tx) {
      return json({ error: "No transaction ID returned" }, 500);
    }

    // Best-effort post-creation steps
    const { error: payError } = await supabase.from("payments").insert({ transaction_id: tx.id, amount_usd: amountUsd, type: "payment", status: "succeeded" });
    if (payError) console.log("Payment insert error:", payError.message);

    const { data: mmResult, error: mmError } = await supabase.rpc("assign_middleman", { tx_id: tx.id });
    console.log("Middleman result:", mmResult, "Error:", mmError?.message);
    if (mmError) console.log("Middleman assignment failed:", mmError.message);
    // Deduct stock for in-game items, mark sold for single-stock listings
    const { data: listingData } = await supabase.from("listings").select("stock").eq("id", listingId).single();
    if (listingData?.stock != null && listingData.stock > 0) {
      await supabase.rpc("deduct_listing_stock", { p_listing_id: listingId, p_quantity: quantity ?? 1 });
    } else {
      await supabase.from("listings").update({ status: "sold" }).eq("id", listingId);
    }

    return json({ verified: true, transactionId: tx.id, network: detectedNetwork, mmAssigned: !mmError });
  } catch (err: any) {
    return json({ error: err?.message || "Internal error" }, 500);
  }
});
