import { useMiddlemanTransactions, useUpdateTransaction } from "@/hooks/useTransactions";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";
import { formatUSD, formatDate, timeAgo, cn } from "@/lib/utils";
import { STATUS_LABELS, TRANSACTION_STATUS_FLOW } from "@/lib/constants";
import { useMemo, useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import {
  Shield, MessageCircle, CheckCircle, ShieldCheck, ArrowRight,
  Clock, Users, BarChart3, Sparkles, Eye, ExternalLink, Wallet,
  UserCheck, Video, Key, BadgeCheck, RefreshCw
} from "lucide-react";

const STATUS_ICONS: Record<string, typeof Shield> = {
  mm_assigned: UserCheck,
  channel_created: MessageCircle,
  demo_completed: Video,
  transfer_witnessed: Key,
  funds_released: BadgeCheck,
  completed: CheckCircle,
};

const STATUS_COLORS: Record<string, string> = {
  mm_assigned: "border-purple-400 bg-purple-50/50 dark:border-purple-500/30 dark:bg-purple-500/5",
  channel_created: "border-indigo-400 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5",
  demo_completed: "border-teal-400 bg-teal-50/50 dark:border-teal-500/30 dark:bg-teal-500/5",
  transfer_witnessed: "border-cyan-400 bg-cyan-50/50 dark:border-cyan-500/30 dark:bg-cyan-500/5",
  funds_released: "border-green-400 bg-green-50/50 dark:border-green-500/30 dark:bg-green-500/5",
  completed: "border-emerald-400 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  mm_assigned: "Create a group chat to begin verification.",
  channel_created: "Waiting for the buyer to approve the demo.",
  demo_completed: "Now witness the account transfer.",
  transfer_witnessed: "Release funds to complete the transaction.",
  funds_released: "Transaction complete!",
};

const FLOW_STEPS = ["mm_assigned", "channel_created", "demo_completed", "transfer_witnessed", "funds_released"] as const;

export function MiddlemanDashboard() {
  const { data: transactions, isLoading, refetch } = useMiddlemanTransactions();
  const updateTx = useUpdateTransaction();

  const [actionError, setActionError] = useState("");
  const { openChat } = useChat();

  const handleAction = async (txId: string, updates: Record<string, unknown>, confirmLabel?: string) => {
    if (confirmLabel && !window.confirm(confirmLabel)) return;
    setActionError("");
    try {
      // Create group chat
      if (updates.status === "channel_created") {
        try {
          const { data: convId, error } = await supabase.rpc("create_transaction_group", { tx_id: txId });
          if (error) { setActionError(error.message); return; }
          const tx = transactions?.find(t => t.id === txId);
          const game = tx?.listing?.game || "the listing";
          if (tx) {
            if (tx.buyer_id) createNotification({
              user_id: tx.buyer_id, type: "channel_created",
              title: "💬 Group Chat Ready",
              message: `A group chat has been created for ${game}. Open the chat panel to join.`,
              link: `/transactions/${txId}`,
            });
            if (tx.listing?.seller_id) createNotification({
              user_id: tx.listing.seller_id, type: "channel_created",
              title: "💬 Group Chat Ready",
              message: `A group chat has been created for ${game}. Open the chat panel to join.`,
              link: `/transactions/${txId}`,
            });
          }
          if (convId) openChat(convId);
          refetch();
          return;
        } catch (err: any) {
          setActionError(err?.message || "Failed to create group chat");
          return;
        }
      } else {
        await updateTx.mutateAsync({ id: txId, updates } as any);

        const tx = transactions?.find(t => t.id === txId);
        if (!tx) { refetch(); return; }

        // Notify participants on every status change
        const game = tx.listing?.game || "a transaction";
        const amount = formatUSD(tx.amount_usd);

        if (updates.status === "demo_completed") {
          if (tx.listing?.seller_id) createNotification({
            user_id: tx.listing.seller_id, type: "demo_completed",
            title: "Demo Completed", message: `The demo for ${game} has been completed. The middleman will now witness the transfer.`,
            link: `/transactions/${txId}`,
          });
          if (tx.buyer_id) createNotification({
            user_id: tx.buyer_id, type: "demo_completed",
            title: "Demo Completed", message: `The demo for ${game} has been completed. Proceeding to transfer.`,
            link: `/transactions/${txId}`,
          });
        }

        if (updates.transfer_witnessed) {
          if (tx.listing?.seller_id) createNotification({
            user_id: tx.listing.seller_id, type: "transfer_witnessed",
            title: "Transfer Witnessed", message: `The middleman confirmed the transfer for ${game}. Funds will be released soon.`,
            link: `/transactions/${txId}`,
          });
          if (tx.buyer_id) createNotification({
            user_id: tx.buyer_id, type: "transfer_witnessed",
            title: "Transfer Witnessed", message: `The middleman confirmed the transfer for ${game}.`,
            link: `/transactions/${txId}`,
          });
        }

        if (updates.funds_released) {
          if (tx.listing?.seller_id) {
            const payout = tx.amount_usd * 0.92;
            try {
              await (supabase as any).rpc("wallet_release_escrow", {
                p_user_id: tx.listing.seller_id,
                p_amount: Math.round(payout * 100) / 100,
                p_tx_id: txId,
                p_desc: `${game} — ${formatUSD(payout)}`,
              });
            } catch {}
            createNotification({
              user_id: tx.listing.seller_id, type: "funds_released",
              title: "Funds Released!", message: `${formatUSD(payout)} has been added to your wallet for ${game}.`,
              link: `/transactions/${txId}`,
            });
          }
        }

        // If marking as completed, handle listing visibility based on type
        if (updates.status === "completed") {
          if (tx.listing_id) {
            const isItems = tx.listing?.listing_type === "in_game_items" || (tx.quantity && tx.quantity > 0);
            if (isItems) {
              try { await (supabase as any).rpc("deduct_listing_stock", { p_listing_id: tx.listing_id, p_quantity: tx.quantity || 1 }); } catch {}
            } else {
              await (supabase as any).rpc("hide_listing", { p_listing_id: tx.listing_id });
            }
          }
          if (tx.buyer_id) createNotification({
            user_id: tx.buyer_id, type: "completed",
            title: "Transaction Completed", message: `Your purchase of ${game} is fully complete.`,
            link: `/transactions/${txId}`,
          });
          if (tx.listing?.seller_id) createNotification({
            user_id: tx.listing.seller_id, type: "completed",
            title: "Transaction Completed", message: `Your sale of ${game} is complete. Thank you!`,
            link: `/transactions/${txId}`,
          });
        }
      }
      refetch();
    } catch (err) { /* Action failed — error displayed in UI */ }
  };

  const stats = useMemo(() => ({
    active: transactions?.filter(t => !["completed", "disputed"].includes(t.status)).length ?? 0,
    completed: transactions?.filter(t => t.status === "completed").length ?? 0,
    totalValue: transactions?.reduce((s, t) => s + t.amount_usd, 0) ?? 0,
  }), [transactions]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Middleman Panel</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Assigned Transactions</h1>
        </div>
        <button onClick={() => refetch()} disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-dark-light dark:text-gray-300 dark:hover:bg-white/5">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 animate-fade-in-up">
          ⚠️ {actionError}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3 animate-fade-in-up delay-75">
        {[
          { label: "Active", value: stats.active, sub: "in progress", icon: Clock, color: "bg-purple-50 dark:bg-purple-500/10", iconColor: "text-purple-600 dark:text-purple-400" },
          { label: "Completed", value: stats.completed, sub: `${transactions?.filter(t => t.status === "completed").length ?? 0} this month`, icon: CheckCircle, color: "bg-green-50 dark:bg-green-500/10", iconColor: "text-green-600 dark:text-green-400" },
          { label: "Total Value", value: formatUSD(stats.totalValue), sub: `${transactions?.length ?? 0} total`, icon: Wallet, color: "bg-blue-50 dark:bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400" },
        ].map((s, si) => (
          <div key={s.label} className="group overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-dark-light"
            style={{ animationDelay: `${si * 0.08}s` }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
              <p className="text-xl font-extrabold tabular-nums text-gray-900 dark:text-white">{s.value}</p>
            </div>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {!transactions || transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-100">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
            <ShieldCheck className="h-7 w-7 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">No Active Assignments</h2>
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
            When a buyer pays, you'll be auto-assigned. Transactions appear here in real-time.
          </p>
        </div>
      ) : (
        <>
          {/* Active Transactions */}
          {transactions.filter(t => t.status !== "completed").length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />Active
              </h2>
              {transactions.filter(t => t.status !== "completed").map((tx, txi) => {
                const currentStep = FLOW_STEPS.indexOf(tx.status as any);
                return (
              <div key={tx.id} className={cn(
                "overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md dark:bg-dark-light animate-fade-in-up",
                STATUS_COLORS[tx.status] ?? "border-gray-100 dark:border-white/10 bg-white"
              )}
                style={{ animationDelay: `${txi * 0.05 + 0.1}s` }}>
                {/* Top bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <Link to={`/transactions/${tx.id}`} className="text-sm font-bold text-gray-900 hover:text-primary dark:text-white dark:hover:text-primary truncate block">
                        {tx.listing?.game ?? "Unknown"}
                      </Link>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{tx.listing?.platform} · {tx.listing?.rank}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base font-extrabold tabular-nums text-gray-900 dark:text-white">{formatUSD(tx.amount_usd)}</span>
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                      tx.status === "completed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
                      tx.status === "funds_released" && "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
                      tx.status === "mm_assigned" && "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
                      tx.status === "channel_created" && "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
                      tx.status === "demo_completed" && "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
                      tx.status === "transfer_witnessed" && "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400"
                    )}>
                      {STATUS_LABELS[tx.status as keyof typeof STATUS_LABELS] ?? tx.status}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 pb-4">
                  {/* Participants */}
                  <div className="mb-3 grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 p-2 dark:bg-white/5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">B</div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">
                          {tx.buyer?.discord_username || tx.buyer?.email?.split("@")[0] || "—"}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Buyer</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 p-2 dark:bg-white/5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-[10px] font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">S</div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">
                          {tx.listing?.seller?.discord_username || tx.listing?.seller?.email?.split("@")[0] || "—"}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Seller</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress flow */}
                  <div className="mb-4">
                    <div className="flex items-center gap-0.5">
                      {FLOW_STEPS.map((step, i) => {
                        const done = i <= currentStep;
                        const active = i === currentStep;
                        const Icon = STATUS_ICONS[step] ?? Clock;
                        return (
                          <div key={step} className="flex flex-1 items-center">
                            <div className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                              done && "border-primary bg-primary text-white shadow-sm shadow-primary/20",
                              active && "ring-4 ring-primary/10",
                              !done && "border-gray-200 bg-white text-gray-300 dark:border-white/10 dark:bg-dark-light dark:text-gray-600"
                            )}>
                              <Icon className="h-3 w-3" />
                            </div>
                            {i < FLOW_STEPS.length - 1 && (
                              <div className={cn("h-0.5 flex-1 mx-0.5 rounded-full transition-colors", i < currentStep ? "bg-primary" : "bg-gray-200 dark:bg-white/10")} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
                      {FLOW_STEPS.map((step, i) => (
                        <span key={step} className={cn(
                          "text-[10px] font-medium",
                          i === currentStep && "text-primary font-bold",
                          i < currentStep && "text-gray-600 dark:text-gray-300",
                          i > currentStep && "text-gray-400 dark:text-gray-500"
                        )}>
                          {STATUS_LABELS[step]}
                        </span>
                      ))}
                    </div>
                    {STATUS_DESCRIPTIONS[tx.status] && (
                      <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">{STATUS_DESCRIPTIONS[tx.status]}</p>
                    )}
                  </div>

                  {/* Actions + footer */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
                    {(tx.status === "mm_assigned" || tx.discord_channel_id === "pending" || tx.discord_channel_id === "manual") && (
                      <button onClick={() => {
                        if (!window.confirm("Create a group chat for this transaction?")) return;
                        handleAction(tx.id, { status: "channel_created", discord_channel_id: "pending" });
                      }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25">
                        <MessageCircle className="h-3.5 w-3.5" />Create Group Chat
                      </button>
                    )}

                    {tx.status === "channel_created" && tx.demo_approved && (
                      <button onClick={() => handleAction(tx.id, { status: "demo_completed" }, "Mark demo as completed?")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-teal-600/20 transition-all hover:bg-teal-700">
                        <Video className="h-3.5 w-3.5" />Mark Demo Completed
                      </button>
                    )}

                    {tx.status === "channel_created" && !tx.demo_approved && (
                      <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        ⏳ Waiting for buyer to approve demo
                      </span>
                    )}

                    {tx.status === "demo_completed" && !tx.transfer_witnessed && (
                      <button onClick={() => handleAction(tx.id, { transfer_witnessed: true, status: "transfer_witnessed" }, "Confirm you witnessed the transfer?")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-md hover:shadow-primary/25">
                        <Key className="h-3.5 w-3.5" />Mark Transfer Witnessed
                      </button>
                    )}

                    {tx.status === "transfer_witnessed" && !tx.funds_released && (
                      <button onClick={() => handleAction(tx.id, { funds_released: true, status: "funds_released" }, "Release funds to seller? This cannot be undone.")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/25">
                        <BadgeCheck className="h-3.5 w-3.5" />Release Funds
                      </button>
                    )}

                    {tx.status === "funds_released" && (
                      <button onClick={() => handleAction(tx.id, { status: "completed" }, "Mark as fully completed?")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400">
                        <CheckCircle className="h-3.5 w-3.5" />Mark Completed
                      </button>
                    )}

                    <div className="flex-1" />

                    <Link to={`/transactions/${tx.id}`}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
                      <Eye className="h-3 w-3" />View
                    </Link>

                    {tx.discord_channel_id === "pending" && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        ⏳ Retry: Group chat pending
                      </span>
                    )}

                    {tx.discord_channel_id && tx.discord_channel_id !== "pending" && (
                      <a href={`https://discord.com/channels/${tx.discord_channel_id}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-600 transition-all hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20">
                        <ExternalLink className="h-3 w-3" />Discord
                      </a>
                    )}

                    {tx.discord_channel_id === "pending" && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        ⏳ Creating group chat...
                      </span>
                    )}

                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                      {timeAgo(tx.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          )}

          {/* History */}
          {transactions.filter(t => t.status === "completed").length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2 mt-6">
                <span className="h-2 w-2 rounded-full bg-green-400" />History
              </h2>
              {transactions.filter(t => t.status === "completed").map((tx, txi) => (
                <div key={tx.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-dark-light opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-500/10">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <Link to={`/transactions/${tx.id}`} className="text-sm font-bold text-gray-900 hover:text-primary dark:text-white dark:hover:text-primary truncate block">
                          {tx.listing?.game ?? "Unknown"}
                        </Link>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                          {tx.listing?.platform} · {tx.listing?.rank} · {formatUSD(tx.amount_usd)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        {STATUS_LABELS[tx.status as keyof typeof STATUS_LABELS] ?? tx.status}
                      </span>
                      <Link to={`/transactions/${tx.id}`}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[10px] font-semibold text-gray-500 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
                        <Eye className="h-3 w-3" />View
                      </Link>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                        {timeAgo(tx.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
