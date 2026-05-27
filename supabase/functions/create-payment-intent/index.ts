// Supabase Edge Function: create-payment-intent
// Creates a Stripe PaymentIntent for the buyer to pay.
// Called from the frontend when buyer clicks "Request Middleman".

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
    const { transactionId, amountUsd } = await req.json();

    if (!transactionId || !amountUsd) {
      return new Response(
        JSON.stringify({ error: "Missing transactionId or amountUsd" }),
        { status: 400 }
      );
    }

    // Verify transaction exists and is awaiting payment
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

    if (tx.status !== "awaiting_payment") {
      return new Response(
        JSON.stringify({ error: "Transaction is not awaiting payment" }),
        { status: 400 }
      );
    }

    // Create PaymentIntent (manual capture for escrow)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountUsd * 100), // cents
      currency: "usd",
      capture_method: "manual",
      metadata: {
        transaction_id: transactionId,
      },
    });

    // Save payment intent ID to transaction
    await supabase
      .from("transactions")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", transactionId);

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-payment-intent error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
});
