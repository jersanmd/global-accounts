import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/contexts/AuthContext";
import { formatUSD, formatDate } from "@/lib/utils";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function WithdrawalHistory() {
  const { user } = useAuth();
  const { withdrawn } = useWallet(user?.id);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCount, setShowCount] = useState(5);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!withdrawn.length) return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center dark:border-white/10 dark:bg-dark-light">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5">
        <History className="h-5 w-5 text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">No withdrawal history</p>
      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Withdrawn payouts will appear here</p>
    </div>
  );

  const totalWithdrawn = withdrawn.reduce((s, b) => s + b.amount, 0);
  const visible = withdrawn.slice(0, showCount);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-dark-light">
      <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4 dark:border-white/5">
        <div className="rounded-lg bg-gray-100 p-1.5 dark:bg-white/5">
          <History className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Withdrawal History</h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{withdrawn.length} withdrawal{withdrawn.length > 1 ? "s" : ""} · {formatUSD(totalWithdrawn)} total</p>
        </div>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-white/5">
        {visible.map((batch) => (
          <div key={batch.batch_id}>
            <button
              onClick={() => toggle(batch.batch_id)}
              className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition-all hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {batch.method}
                  </p>
                  <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 dark:bg-white/5 dark:text-gray-400">
                    {batch.sales?.length ?? 0} sale{(batch.sales?.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(batch.date)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{formatUSD(batch.amount)}</p>
                {expanded.has(batch.batch_id) ? (
                  <ChevronUp className="ml-auto mt-0.5 h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                ) : (
                  <ChevronDown className="ml-auto mt-0.5 h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                )}
              </div>
            </button>
            {expanded.has(batch.batch_id) && batch.sales && (
              <div className="border-t border-gray-50 bg-gray-50/50 px-6 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {batch.sales.map((sale, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{sale.game}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold tabular-nums text-gray-600 dark:text-gray-400">{formatUSD(sale.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {withdrawn.length > showCount && (
        <button onClick={() => setShowCount(c => c + 5)}
          className="flex w-full items-center justify-center gap-1 border-t border-gray-50 py-3 text-[11px] font-semibold text-gray-400 transition-all hover:bg-gray-50/50 hover:text-gray-600 dark:border-white/5 dark:hover:bg-white/[0.02] dark:hover:text-gray-400">
          Show more <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
