import { useParams, Link } from "react-router-dom";
import { useTransaction, useUpdateTransaction } from "@/hooks/useTransactions";
import { useRealtimeTransaction } from "@/hooks/useRealtimeTransaction";
import { useAuth } from "@/contexts/AuthContext";
import { formatUSD, calcBuyerPrice, calcSellerPayout, formatDate } from "@/lib/utils";
import {
  STATUS_LABELS,
  TRANSACTION_STATUS_FLOW,
  BUYER_FEE_PERCENT,
  SELLER_FEE_PERCENT,
} from "@/lib/constants";
import { cn, getStatusProgress } from "@/lib/utils";
import { Check, ExternalLink, AlertTriangle } from "lucide-react";
import { useState } from "react";

export function TransactionView() {
  const { id } = useParams<{ id: string }>();
  const { data: tx, isLoading, refetch } = useTransaction(id);
  const { profile } = useAuth();
  const updateTx = useUpdateTransaction();
  const [actionError, setActionError] = useState("");

  // Real-time subscription
  useRealtimeTransaction(id);

  const handleAction = async (updates: Record<string, unknown>) => {
    if (!id) return;
    setActionError("");
    try {
      await updateTx.mutateAsync({ id, updates } as { id: string; updates: Record<string, unknown> });
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="py-16 text-center text-gray-500">Transaction not found.</div>
    );
  }

  const listingPrice = tx.listing?.price_usd ?? 0;
  const buyerPrice = calcBuyerPrice(listingPrice);
  const sellerPayout = calcSellerPayout(listingPrice);
  const progress = getStatusProgress(tx.status, TRANSACTION_STATUS_FLOW);
  const isBuyer = profile?.id === tx.buyer_id;
  const isMiddleman = profile?.id === tx.middleman_id;
  const isSeller = profile?.id === tx.listing?.seller_id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transaction</h1>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
          {STATUS_LABELS[tx.status as keyof typeof STATUS_LABELS] ?? tx.status}
        </span>
      </div>

      {actionError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Progress Tracker */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-500">Progress</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />
          {TRANSACTION_STATUS_FLOW.map((status, i) => {
            const done = i <= progress;
            const active = i === progress;
            return (
              <div key={status} className="relative flex items-start gap-4 pb-5 last:pb-0">
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done
                      ? "border-primary bg-primary text-white"
                      : "border-gray-300 bg-white text-gray-400"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <div className="pt-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-primary" : done ? "text-gray-700" : "text-gray-400"
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-500">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Listing</dt>
              <dd>
                <Link
                  to={`/listings/${tx.listing_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {tx.listing?.game} ({tx.listing?.platform})
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Listing Price</dt>
              <dd>{formatUSD(listingPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Buyer Fee ({BUYER_FEE_PERCENT}%)</dt>
              <dd>{formatUSD(buyerPrice - listingPrice)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <dt>Total Paid</dt>
              <dd className="text-primary">{formatUSD(buyerPrice)}</dd>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <dt>Seller Payout ({100 - SELLER_FEE_PERCENT}%)</dt>
              <dd>{formatUSD(sellerPayout)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-500">Participants</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Buyer</span>
              <span className="font-medium">{tx.buyer?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Seller</span>
              <span className="font-medium">{tx.listing?.seller?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Middleman</span>
              <span className="font-medium">
                {tx.middleman?.email ?? "Not assigned"}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Created {formatDate(tx.created_at)}
          </p>
        </div>
      </div>

      {/* Discord Channel */}
      {tx.discord_channel_id && (
        <div className="rounded-xl border bg-indigo-50 p-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800">
              Discord channel created
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-500">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {/* Buyer: Approve Demo */}
          {isBuyer && tx.status === "channel_created" && !tx.demo_approved && (
            <button
              onClick={() => handleAction({ demo_approved: true, status: "demo_completed" })}
              disabled={updateTx.isPending}
              className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              Approve Demo
            </button>
          )}

          {/* Middleman: Create Discord Channel */}
          {isMiddleman && tx.status === "mm_assigned" && !tx.discord_channel_id && (
            <button
              onClick={() =>
                handleAction({
                  status: "channel_created",
                  discord_channel_id: "pending", // Will be replaced by Edge Function
                })
              }
              disabled={updateTx.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Create Discord Channel
            </button>
          )}

          {/* Middleman: Mark Demo Completed */}
          {isMiddleman &&
            tx.status === "channel_created" &&
            tx.demo_approved && (
              <button
                onClick={() => handleAction({ status: "demo_completed" })}
                disabled={updateTx.isPending}
                className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                Mark Demo Completed
              </button>
            )}

          {/* Middleman: Mark Transfer Witnessed */}
          {isMiddleman && tx.status === "demo_completed" && !tx.transfer_witnessed && (
            <button
              onClick={() =>
                handleAction({
                  transfer_witnessed: true,
                  status: "transfer_witnessed",
                })
              }
              disabled={updateTx.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              Mark Transfer Witnessed
            </button>
          )}

          {/* Middleman: Release Funds */}
          {isMiddleman &&
            tx.status === "transfer_witnessed" &&
            !tx.funds_released && (
              <button
                onClick={() =>
                  handleAction({
                    funds_released: true,
                    status: "funds_released",
                  })
                }
                disabled={updateTx.isPending}
                className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                Release Funds
              </button>
            )}

          {/* Buyer/Seller: Report Issue */}
          {(isBuyer || isSeller) &&
            tx.status !== "completed" &&
            tx.status !== "disputed" && (
              <button
                onClick={() => handleAction({ status: "disputed" })}
                disabled={updateTx.isPending}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                Report Issue
              </button>
            )}

          {tx.status === "completed" && (
            <p className="text-sm text-success font-medium">
              Transaction completed successfully!
            </p>
          )}

          {tx.status === "disputed" && (
            <p className="text-sm text-red-600 font-medium">
              This transaction has been flagged for admin review.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
