// Supabase Edge Function: handle-payment-success
// Stripe webhook handler — creates transaction on first payment, updates on subsequent.
// Transaction is NOT created until payment confirmed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const meta = pi.metadata;

      // Check if transaction already exists (old flow compatibility)
      if (meta.transaction_id) {
        await supabase.from("transactions").update({ status: "paid" }).eq("id", meta.transaction_id);
        await supabase.from("payments").insert({
          transaction_id: meta.transaction_id, amount_usd: pi.amount / 100, type: "payment", status: "succeeded",
        });
        await supabase.rpc("assign_middleman", { tx_id: meta.transaction_id });
        return new Response("OK", { status: 200 });
      }

      // New flow: create transaction from metadata
      if (!meta.listing_id || !meta.buyer_id || !meta.amount_usd) {
        console.error("Missing metadata for transaction creation");
        return new Response("OK", { status: 200 });
      }

      const amountUsd = parseFloat(meta.amount_usd);
      const quantity = parseInt(meta.quantity || "1");

      // Create transaction with status "paid"
      const { data: tx, error: createError } = await supabase
        .from("transactions")
        .insert({
          listing_id: meta.listing_id,
          buyer_id: meta.buyer_id,
          amount_usd: amountUsd,
          quantity,
          status: "paid",
          stripe_payment_intent_id: pi.id,
          payment_method: "stripe",
        })
        .select("id")
        .single();

      if (createError || !tx) {
        console.error("Failed to create transaction:", createError);
        return new Response("OK", { status: 200 });
      }

      // Log payment
      await supabase.from("payments").insert({
        transaction_id: tx.id, amount_usd: amountUsd, type: "payment", status: "succeeded",
      });

      // Assign middleman
      const { error: mmError } = await supabase.rpc("assign_middleman", { tx_id: tx.id });
      if (mmError) console.error("Middleman assignment failed:", mmError);

      // Mark listing as sold
      await supabase.from("listings").update({ status: "sold" }).eq("id", meta.listing_id);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Webhook error", { status: 400 });
  }
});
