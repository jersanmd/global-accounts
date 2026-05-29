// Supabase Edge Function: create-payment-intent
// Creates a Stripe PaymentIntent for direct checkout (no transaction yet).
// Transaction is created by handle-payment-success webhook after payment.

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
    const { listingId, amountUsd, buyerId, quantity } = await req.json();

    if (!listingId || !amountUsd || !buyerId) {
      return new Response(
        JSON.stringify({ error: "Missing listingId, amountUsd, or buyerId" }),
        { status: 400 }
      );
    }

    // Verify listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, seller_id, game, price_usd, status")
      .eq("id", listingId)
      .single();

    if (listingError || !listing || listing.status !== "active") {
      return new Response(JSON.stringify({ error: "Listing not available" }), { status: 400 });
    }

    // Create PaymentIntent with purchase metadata (transaction created later)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountUsd * 100),
      currency: "usd",
      capture_method: "manual",
      metadata: {
        listing_id: listingId,
        buyer_id: buyerId,
        amount_usd: String(amountUsd),
        quantity: String(quantity ?? 1),
        payment_method: "stripe",
      },
    });

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
