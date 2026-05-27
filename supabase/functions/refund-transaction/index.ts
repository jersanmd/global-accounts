// Supabase Edge Function: refund-transaction
// Refunds the PaymentIntent to the buyer. Used by admin for dispute resolution.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing transactionId" }),
        { status: 400 }
      );
    }

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
      });
    }

    if (!tx.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "No payment intent found" }),
        { status: 400 }
      );
    }

    // Create refund (full amount)
    const refund = await stripe.refunds.create({
      payment_intent: tx.stripe_payment_intent_id,
    });

    // Log refund
    await supabase.from("payments").insert({
      transaction_id: transactionId,
      stripe_transfer_id: refund.id,
      amount_usd: tx.amount_usd,
      type: "refund",
      status: refund.status === "succeeded" ? "succeeded" : "failed",
    });

    // Update transaction
    await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", transactionId);

    // Re-list the listing
    await supabase
      .from("listings")
      .update({ status: "active" })
      .eq("id", tx.listing_id);

    return new Response(
      JSON.stringify({ success: true, refundId: refund.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("refund-transaction error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
});
