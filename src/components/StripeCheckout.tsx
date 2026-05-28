import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

interface StripeCheckoutProps {
  transactionId: string;
  amountUsd: number;
  onSuccess: () => void;
  onCancel: () => void;
}

/** Wraps the Stripe Elements provider */
export function StripeCheckout({
  transactionId,
  amountUsd,
  onSuccess,
  onCancel,
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch client secret from Edge Function
  const initPayment = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-payment-intent",
        { body: { transactionId, amountUsd } }
      );
      if (fnError) throw fnError;
      setClientSecret(data.clientSecret);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment initialization failed");
    } finally {
      setLoading(false);
    }
  };

  if (!stripePromise) {
    return (
      <div className="p-4 text-red-600">
        Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in your .env file.
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-dark-light">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complete Payment</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Click below to initialize the secure payment form.
        </p>
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={initPayment}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Pay with Card"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

function CheckoutForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message ?? "Payment failed");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-dark-light"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Card Details</h3>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PaymentElement />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {processing ? "Processing..." : "Pay Now"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
