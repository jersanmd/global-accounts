import { useMiddlemanTransactions, useUpdateTransaction } from "@/hooks/useTransactions";
import { Link } from "react-router-dom";
import { formatUSD, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";

export function MiddlemanDashboard() {
  const { data: transactions, isLoading, refetch } = useMiddlemanTransactions();
  const updateTx = useUpdateTransaction();

  const handleCreateChannel = async (txId: string) => {
    try {
      await updateTx.mutateAsync({
        id: txId,
        updates: {
          status: "channel_created",
          discord_channel_id: "pending",
        },
      });
      refetch();
    } catch (err) {
      console.error("Failed to create channel:", err);
    }
  };

  const handleAction = async (txId: string, updates: Record<string, unknown>) => {
    try {
      await updateTx.mutateAsync({ id: txId, updates } as { id: string; updates: Record<string, unknown> });
      refetch();
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Middleman Dashboard</h1>

      {transactions && transactions.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          No assigned transactions. Waiting for new requests...
        </div>
      ) : (
        <div className="space-y-4">
          {transactions?.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <Link
                    to={`/transactions/${tx.id}`}
                    className="text-lg font-semibold hover:text-primary transition-colors"
                  >
                    {tx.listing?.game} — {formatUSD(tx.amount_usd)}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {tx.listing?.platform} • {tx.listing?.rank}
                  </p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {STATUS_LABELS[tx.status as keyof typeof STATUS_LABELS] ?? tx.status}
                </span>
              </div>

              <div className="mb-3 text-sm text-gray-600">
                <p>
                  Buyer: <span className="font-medium">{tx.buyer?.email}</span>
                </p>
                <p>
                  Seller:{" "}
                  <span className="font-medium">
                    {tx.listing?.seller?.email}
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  Created {formatDate(tx.created_at)}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {tx.status === "mm_assigned" && !tx.discord_channel_id && (
                  <button
                    onClick={() => handleCreateChannel(tx.id)}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    Create Discord Channel
                  </button>
                )}

                {tx.status === "channel_created" && tx.demo_approved && (
                  <button
                    onClick={() =>
                      handleAction(tx.id, { status: "demo_completed" })
                    }
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition-colors"
                  >
                    Mark Demo Completed
                  </button>
                )}

                {tx.status === "demo_completed" && !tx.transfer_witnessed && (
                  <button
                    onClick={() =>
                      handleAction(tx.id, {
                        transfer_witnessed: true,
                        status: "transfer_witnessed",
                      })
                    }
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                  >
                    Mark Transfer Witnessed
                  </button>
                )}

                {tx.status === "transfer_witnessed" && !tx.funds_released && (
                  <button
                    onClick={() =>
                      handleAction(tx.id, {
                        funds_released: true,
                        status: "funds_released",
                      })
                    }
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition-colors"
                  >
                    Release Funds
                  </button>
                )}

                <Link
                  to={`/transactions/${tx.id}`}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  View Details
                </Link>

                {tx.discord_channel_id && tx.discord_channel_id !== "pending" && (
                  <a
                    href={`https://discord.com/channels/${tx.discord_channel_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    Open Discord
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
