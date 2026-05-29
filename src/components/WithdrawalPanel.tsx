import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { formatUSD, formatDate } from "@/lib/utils";
import { Wallet, ArrowDownCircle, Check, X, CheckCircle } from "lucide-react";

const WITHDRAWAL_METHODS = [
  { id: "gcash", label: "GCash", icon: "📱" },
  { id: "maya", label: "Maya", icon: "🏦" },
  { id: "bank", label: "Bank Transfer", icon: "🏛️" },
];

export function WithdrawalPanel() {
  const { user } = useAuth();
  const { balance, withdrawable, withdraw } = useWallet(user?.id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState("gcash");
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [successAmount, setSuccessAmount] = useState<number | null>(null);

  const toggleEntry = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedTotal = withdrawable
    .filter(e => selectedIds.has(e.ledger_id))
    .reduce((s, e) => s + e.amount, 0);

  const handleWithdraw = async () => {
    if (selectedIds.size === 0) return;
    setError("");
    try {
      await withdraw.mutateAsync({
        ledgerIds: [...selectedIds],
        method,
      });
      setSuccessAmount(selectedTotal);
      setSelectedIds(new Set());
      setShowConfirm(false);
      setTimeout(() => setSuccessAmount(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      {successAmount !== null && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 animate-fade-in-up dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          {formatUSD(successAmount)} withdrawn via {WITHDRAWAL_METHODS.find(m => m.id === method)?.label}
        </div>
      )}

      {/* Balance Card */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-500/20 dark:bg-green-500/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Available Balance</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-green-700 dark:text-green-300">{formatUSD(balance)}</p>
          </div>
          <div className="rounded-xl bg-green-100 p-2.5 dark:bg-green-500/10">
            <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Withdrawable Entries */}
      {withdrawable.length > 0 ? (
        <>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Withdrawable Sales ({withdrawable.length})
          </h3>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {withdrawable.map((entry) => (
              <button
                key={entry.ledger_id}
                onClick={() => toggleEntry(entry.ledger_id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  selectedIds.has(entry.ledger_id)
                    ? "border-primary/30 bg-primary/5 dark:border-primary/30 dark:bg-primary/5"
                    : "border-gray-100 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-dark-light dark:hover:bg-white/5"
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                  selectedIds.has(entry.ledger_id)
                    ? "border-primary bg-primary text-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}>
                  {selectedIds.has(entry.ledger_id) && <Check className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 truncate dark:text-white">
                    {entry.title || entry.game || "Sale"}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {entry.platform && `${entry.platform} · `}{formatDate(entry.date)}
                  </p>
                </div>
                <p className="text-sm font-extrabold tabular-nums text-primary">{formatUSD(entry.amount)}</p>
              </button>
            ))}
          </div>

          {/* Method Selector */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Withdraw via
            </label>
            <div className="flex gap-2">
              {WITHDRAWAL_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all ${
                    method === m.id
                      ? "border-primary/50 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/10"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-white/10 dark:text-gray-400"
                  }`}
                >
                  <span className="mr-1">{m.icon}</span>{m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Withdraw Button */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={selectedIds.size === 0 || withdraw.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark disabled:opacity-50"
          >
            <ArrowDownCircle className="h-4 w-4" />
            {selectedIds.size === 0 ? "Select sales to withdraw" : `Withdraw ${formatUSD(selectedTotal)}`}
          </button>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/10">
          <Wallet className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">No funds available</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Complete sales appear here for withdrawal</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
          <X className="h-3.5 w-3.5" />{error}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-light">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Confirm Withdrawal</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              You're withdrawing <strong className="text-gray-900 dark:text-white">{formatUSD(selectedTotal)}</strong> from {selectedIds.size} sale(s) via {WITHDRAWAL_METHODS.find(m => m.id === method)?.label}.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
                Cancel
              </button>
              <button onClick={handleWithdraw} disabled={withdraw.isPending}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50">
                {withdraw.isPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
