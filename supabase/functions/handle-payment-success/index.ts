// Supabase Edge Function: handle-payment-success
// Stripe webhook handler — called when buyer completes payment.
// Updates transaction status to 'paid' and triggers middleman assignment.

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
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const transactionId = paymentIntent.metadata.transaction_id;

      if (!transactionId) {
        console.error("No transaction_id in payment metadata");
        return new Response("OK", { status: 200 });
      }

      // Update transaction to paid
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: "paid" })
        .eq("id", transactionId);

      if (updateError) {
        console.error("Failed to update transaction:", updateError);
        return new Response("OK", { status: 200 });
      }

      // Log payment
      await supabase.from("payments").insert({
        transaction_id: transactionId,
        amount_usd: paymentIntent.amount / 100,
        type: "payment",
        status: "succeeded",
      });

      // Assign middleman via RPC
      const { error: mmError } = await supabase.rpc("assign_middleman", {
        tx_id: transactionId,
      });

      if (mmError) {
        console.error("Middleman assignment failed:", mmError);
        // Transaction stays at 'paid' — admin can manually assign
      }

      // Mark listing as sold
      const { data: tx } = await supabase
        .from("transactions")
        .select("listing_id")
        .eq("id", transactionId)
        .single();

      if (tx) {
        await supabase
          .from("listings")
          .update({ status: "sold" })
          .eq("id", tx.listing_id);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Webhook error", { status: 400 });
  }
});
