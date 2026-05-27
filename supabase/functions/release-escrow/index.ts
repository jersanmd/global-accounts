// Supabase Edge Function: release-escrow
// Captures the Stripe PaymentIntent and transfers funds to the seller's Connect account.
// Called by the middleman when clicking "Release Funds".

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

    // Get transaction
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("*, listing:listings(seller_id, price_usd)")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
      });
    }

    if (tx.status !== "transfer_witnessed") {
      return new Response(
        JSON.stringify({ error: "Transaction is not ready for fund release" }),
        { status: 400 }
      );
    }

    // Check seller KYC
    const sellerId = (tx.listing as unknown as { seller_id: string }).seller_id;
    const { data: seller, error: sellerError } = await supabase
      .from("profiles")
      .select("kyc_status, stripe_account_id")
      .eq("id", sellerId)
      .single();

    if (sellerError || !seller) {
      return new Response(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });
    }

    if (seller.kyc_status !== "approved") {
      return new Response(
        JSON.stringify({ error: "Seller KYC not approved" }),
        { status: 400 }
      );
    }

    // Capture the PaymentIntent
    if (tx.stripe_payment_intent_id) {
      await stripe.paymentIntents.capture(tx.stripe_payment_intent_id);
    }

    // Calculate seller payout (minus 8% fee)
    const listingPrice = (tx.listing as unknown as { price_usd: number }).price_usd;
    const sellerPayout = Math.round(listingPrice * 0.92 * 100); // 92% in cents

    // Transfer to seller's Connect account (if they have one)
    if (seller.stripe_account_id) {
      const transfer = await stripe.transfers.create({
        amount: sellerPayout,
        currency: "usd",
        destination: seller.stripe_account_id,
      });

      // Log the transfer
      await supabase.from("payments").insert({
        transaction_id: transactionId,
        stripe_transfer_id: transfer.id,
        amount_usd: sellerPayout / 100,
        type: "transfer",
        status: "succeeded",
      });
    }

    // Update transaction
    await supabase
      .from("transactions")
      .update({
        funds_released: true,
        status: "completed",
      })
      .eq("id", transactionId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("release-escrow error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
});
