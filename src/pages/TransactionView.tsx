import { useParams, Link } from "react-router-dom";
import { useTransaction, useUpdateTransaction } from "@/hooks/useTransactions";
import { useRealtimeTransaction } from "@/hooks/useRealtimeTransaction";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatUSD, calcBuyerPrice, calcSellerPayout, formatDate, timeAgo } from "@/lib/utils";
import {
  STATUS_LABELS,
  TRANSACTION_STATUS_FLOW,
  BUYER_FEE_PERCENT,
  SELLER_FEE_PERCENT,
} from "@/lib/constants";
import { cn, getStatusProgress } from "@/lib/utils";
import { Check, ExternalLink, AlertTriangle, CreditCard, Shield, User, ArrowRight, Clock, GitCommit, CheckCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TransactionHistoryEntry } from "@/lib/types";
import { StripeCheckout } from "@/components/StripeCheckout";import { createNotification } from "@/hooks/useNotifications";
export function TransactionView() {
  const { id } = useParams<{ id: string }>();
  const { data: tx, isLoading, refetch } = useTransaction(id);
  const { profile } = useAuth();
  const updateTx = useUpdateTransaction();
  const [actionError, setActionError] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  // Real-time subscription
  useRealtimeTransaction(id);

  // Fetch transaction history
  const { data: history } = useQuery({
    queryKey: ["transaction_history", id],
    queryFn: async (): Promise<TransactionHistoryEntry[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("transaction_history")
        .select("*")
        .eq("transaction_id", id)
        .order("created_at", { ascending: true });
      if (error && error.code !== "PGRST116") throw error;
      return (data as TransactionHistoryEntry[]) ?? [];
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch discord invite
  const { data: discordInvite } = useQuery({
    queryKey: ["discord_invite", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("discord_invites")
        .select("invite_url, invite_code, used")
        .eq("transaction_id", id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as { invite_url: string; invite_code: string; used: boolean } | null;
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Build timestamp map from history: new_status → created_at
  const statusTimestamps = useMemo(() => {
    const map: Record<string, string> = {};
    if (history) {
      for (const entry of history) {
        if (entry.new_status && !map[entry.new_status]) {
          map[entry.new_status] = entry.created_at;
        }
      }
    }
    return map;
  }, [history]);

  const handleAction = async (updates: Record<string, unknown>, confirmLabel?: string) => {
    if (!id) return;
    // Confirmation dialog
    if (confirmLabel && !window.confirm(confirmLabel)) return;
    setActionError("");
    try {
      await updateTx.mutateAsync({ id, updates } as { id: string; updates: Record<string, unknown> });

      // When payment is marked as paid, auto-assign a middleman and hide listing
      if (updates.status === "paid") {
        const { error: mmError } = await (supabase as any).rpc("assign_middleman", { p_transaction_id: id });
        if (mmError) console.error("Middleman assignment failed:", mmError);

        if (tx?.listing_id) {
          await (supabase as any).rpc("hide_listing", { p_listing_id: tx.listing_id });
        }

        // Notify seller
        if (tx?.listing?.seller_id) {
          createNotification({
            user_id: tx.listing.seller_id,
            type: "payment_received",
            title: "Payment Received",
            message: `Buyer paid ${formatUSD(tx.amount_usd)} for ${tx.listing?.game ?? "your listing"}. A middleman will be assigned.`,
            link: `/transactions/${id}`,
          });
        }
      }

      // Notify on key status changes
      if (updates.status === "mm_assigned" && tx?.middleman_id) {
        createNotification({
          user_id: tx.middleman_id,
          type: "new_assignment",
          title: "New Middleman Assignment",
          message: `You've been assigned to ${tx.listing?.game ?? "a transaction"} (${formatUSD(tx.amount_usd)}). Create a Discord channel to begin.`,
          link: `/transactions/${id}`,
        });
        if (tx.buyer_id) createNotification({
          user_id: tx.buyer_id, type: "mm_assigned",
          title: "Middleman Assigned", message: `A middleman has been assigned to your ${tx.listing?.game ?? "purchase"}.`,
          link: `/transactions/${id}`,
        });
      }

      if (updates.status === "channel_created" && tx?.buyer_id) {
        const inviteMsg = discordInvite?.invite_url ? ` Join: ${discordInvite.invite_url}` : "";
        createNotification({ user_id: tx.buyer_id, type: "channel_created", title: "🔒 Discord Channel Ready", message: `The middleman created a private Discord channel for ${tx.listing?.game ?? "your purchase"}.${inviteMsg}`, link: `/transactions/${id}` });
        if (tx.listing?.seller_id) createNotification({ user_id: tx.listing.seller_id, type: "channel_created", title: "🔒 Discord Channel Ready", message: `The middleman created a private Discord channel for ${tx.listing?.game ?? "your listing"}.${inviteMsg}`, link: `/transactions/${id}` });
      }

      if (updates.status === "demo_completed" && tx?.listing?.seller_id) {
        createNotification({ user_id: tx.listing.seller_id, type: "demo_approved", title: "Demo Approved", message: "Buyer approved the account demo. The middleman will now witness the transfer.", link: `/transactions/${id}` });
      }

      if (updates.status === "funds_released") {
        if (tx?.listing?.seller_id) createNotification({ user_id: tx.listing.seller_id, type: "funds_released", title: "Funds Released!", message: `${formatUSD(tx.amount_usd)} has been released to you for ${tx.listing?.game ?? "your sale"}.`, link: `/transactions/${id}` });
      }

      if (updates.status === "transfer_witnessed") {
        if (tx?.listing?.seller_id) createNotification({ user_id: tx.listing.seller_id, type: "transfer_witnessed", title: "Transfer Witnessed", message: "The middleman has witnessed the account transfer. Funds will be released soon.", link: `/transactions/${id}` });
        if (tx?.buyer_id) createNotification({ user_id: tx.buyer_id, type: "transfer_witnessed", title: "Transfer Witnessed", message: "The middleman confirmed the transfer. Waiting for funds release.", link: `/transactions/${id}` });
      }

      if (updates.status === "completed") {
        if (tx?.listing_id) {
          await (supabase as any).rpc("hide_listing", { p_listing_id: tx.listing_id });
        }
        if (tx?.buyer_id) createNotification({ user_id: tx.buyer_id, type: "completed", title: "Transaction Completed", message: `Your ${tx.listing?.game ?? "purchase"} is fully complete.`, link: `/transactions/${id}` });
        if (tx?.listing?.seller_id) createNotification({ user_id: tx.listing.seller_id, type: "completed", title: "Transaction Completed", message: `${tx.listing?.game ?? "Your sale"} is complete. Thank you!`, link: `/transactions/${id}` });
        if (tx?.middleman_id) createNotification({ user_id: tx.middleman_id, type: "completed", title: "Transaction Completed", message: `Your work on ${tx.listing?.game ?? "this transaction"} is done.`, link: `/transactions/${id}` });
      }

      if (updates.status === "disputed") {
        if (tx?.buyer_id) createNotification({ user_id: tx.buyer_id, type: "disputed", title: "Transaction Disputed", message: `Your ${tx.listing?.game ?? "transaction"} has been flagged. An admin will review it.`, link: `/transactions/${id}` });
        if (tx?.listing?.seller_id) createNotification({ user_id: tx.listing.seller_id, type: "disputed", title: "Transaction Disputed", message: `Your ${tx.listing?.game ?? "sale"} has been flagged for review.`, link: `/transactions/${id}` });
        if (tx?.middleman_id) createNotification({ user_id: tx.middleman_id, type: "disputed", title: "Transaction Disputed", message: `${tx.listing?.game ?? "A transaction"} has been disputed. An admin will handle it.`, link: `/transactions/${id}` });
      }

      if (updates.demo_approved) {
        if (tx?.listing?.seller_id) createNotification({ user_id: tx.listing.seller_id, type: "demo_approved", title: "Demo Approved", message: "The buyer approved the demo. The middleman will now proceed.", link: `/transactions/${id}` });
        if (tx?.middleman_id) createNotification({ user_id: tx.middleman_id, type: "demo_approved", title: "Demo Approved", message: "Buyer approved the demo. You may now witness the transfer.", link: `/transactions/${id}` });
      }

      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
          <AlertTriangle className="h-7 w-7 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Transaction not found</p>
        <Link to="/" className="mt-3 text-xs font-medium text-primary hover:underline">Back to Browse</Link>
      </div>
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
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in-up">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Transaction</p>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {tx.listing?.game || tx.listing_id?.slice(0, 8) || "Transaction"} · {formatUSD(tx.amount_usd)}
          </h1>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
          tx.status === "completed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
          tx.status === "disputed" && "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
          tx.status === "awaiting_payment" && "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
          tx.status === "paid" && "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
          tx.status === "mm_assigned" && "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
          tx.status === "channel_created" && "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
          tx.status === "demo_completed" && "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
          tx.status === "transfer_witnessed" && "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
          tx.status === "funds_released" && "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
        )}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            tx.status === "completed" && "bg-emerald-400",
            tx.status === "disputed" && "bg-red-400",
            tx.status === "awaiting_payment" && "bg-amber-400",
            tx.status === "paid" && "bg-blue-400",
            tx.status === "mm_assigned" && "bg-purple-400",
            tx.status === "channel_created" && "bg-indigo-400",
            tx.status === "demo_completed" && "bg-teal-400",
            tx.status === "transfer_witnessed" && "bg-cyan-400",
            tx.status === "funds_released" && "bg-green-400"
          )} />
          {STATUS_LABELS[tx.status as keyof typeof STATUS_LABELS] ?? tx.status}
        </span>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 animate-fade-in-up">
          {actionError}
        </div>
      )}

      {/* Progress Tracker */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-75">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Progress</h2>
        <div className="relative flex items-center justify-between">
          {TRANSACTION_STATUS_FLOW.map((status, i) => {
            const done = i < progress;
            const active = i === progress;
            return (
              <div key={status} className="relative flex flex-1 flex-col items-center">
                {/* Connector line */}
                {i > 0 && (
                  <div className={cn(
                    "absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2",
                    i <= progress ? "bg-primary/60" : "bg-gray-200 dark:bg-white/10"
                  )} />
                )}
                <div className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                  done && "border-primary bg-primary text-white shadow-sm shadow-primary/20",
                  active && "border-primary bg-white text-primary dark:bg-dark-light ring-4 ring-primary/10",
                  !done && !active && "border-gray-200 bg-white text-gray-300 dark:border-white/10 dark:bg-dark-light dark:text-gray-600"
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </div>
                <p className={cn(
                  "mt-1.5 text-center text-[10px] font-medium leading-tight",
                  active && "text-primary font-bold",
                  done && "text-gray-700 dark:text-gray-300",
                  !done && !active && "text-gray-400 dark:text-gray-500"
                )}>
                  {STATUS_LABELS[status]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-4 sm:grid-cols-2 animate-fade-in-up delay-100">
        {/* Details */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-light">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Details</h3>
          <dl className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Listing</dt>
              <dd>
                <Link to={`/listings/${tx.listing_id}`}
                  className="font-semibold text-primary hover:underline">
                  {tx.listing?.game}
                </Link>
                <span className="ml-1 text-gray-400 dark:text-gray-500">· {tx.listing?.platform}</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">List Price</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{formatUSD(listingPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Buyer Fee ({BUYER_FEE_PERCENT}%)</dt>
              <dd className="text-gray-500 dark:text-gray-400">+{formatUSD(buyerPrice - listingPrice)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2.5 dark:border-white/5">
              <dt className="font-semibold text-gray-900 dark:text-white">Total Paid</dt>
              <dd className="text-sm font-extrabold text-primary">{formatUSD(buyerPrice)}</dd>
            </div>
            <div className="flex justify-between text-[11px]">
              <dt className="text-gray-400 dark:text-gray-500">Seller Receives ({100 - SELLER_FEE_PERCENT}%)</dt>
              <dd className="font-medium text-gray-500 dark:text-gray-400">{formatUSD(sellerPayout)}</dd>
            </div>
          </dl>
        </div>

        {/* Participants */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-light">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Participants</h3>
          <div className="space-y-3">
            {[
              { role: "Buyer", user: tx.buyer, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
              { role: "Seller", user: tx.listing?.seller, color: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" },
              { role: "Middleman", user: tx.middleman, fallback: "Not assigned", color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
            ].map(({ role, user, fallback, color }) => (
              <div key={role} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5 dark:bg-white/5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", color)}>
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{role}</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    {user?.discord_username || user?.email?.split("@")[0] || fallback || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />{formatDate(tx.created_at)}
          </p>
        </div>
      </div>

      {/* Discord Channel / Invite */}
      {(tx.discord_channel_id || discordInvite) && (
        <div className="rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-5 dark:border-indigo-500/30 dark:from-indigo-500/5 dark:via-dark-light dark:to-purple-500/5 animate-fade-in-up delay-150 shadow-lg shadow-indigo-100/50 dark:shadow-none relative overflow-hidden">
          {/* Glow accent */}
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-200/40 dark:bg-indigo-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20 ring-4 ring-indigo-50 dark:ring-indigo-500/10">
                <ExternalLink className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-base font-extrabold text-indigo-900 dark:text-indigo-200">🔒 Transaction Discord</p>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">All verification and transfer happens here</p>
              </div>
            </div>

            {discordInvite?.invite_url ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white animate-pulse">!</span>
                  Click to join the private channel:
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <a
                    href={discordInvite.invite_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    Join Discord Server
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <div className="flex items-center gap-2">
                    <a
                      href={discordInvite.invite_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-white px-3 py-2.5 text-xs font-mono font-bold text-indigo-700 hover:text-indigo-500 hover:underline hover:bg-indigo-50 dark:bg-dark-light dark:text-indigo-300 dark:hover:text-indigo-200 border border-indigo-200 dark:border-indigo-500/20 transition-all select-all flex-1 text-center"
                    >
                      {discordInvite.invite_url}
                    </a>
                    <button
                      onClick={() => { navigator.clipboard.writeText(discordInvite.invite_url); }}
                      className="shrink-0 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-100 active:scale-95 dark:bg-dark-light dark:text-indigo-400 dark:hover:bg-white/5 border border-indigo-200 dark:border-indigo-500/20"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                {discordInvite?.used && (
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold">✓ Invite accepted</p>
                )}
              </div>
            ) : tx.discord_channel_id === "pending" || tx.discord_channel_id === "manual" ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                ⏳ Waiting for Discord bot to generate invite...
              </p>
            ) : tx.discord_channel_id ? (
              <a
                href={`https://discord.com/channels/${tx.discord_channel_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400"
              >
                Open Discord Channel <ArrowRight className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      )}

      {/* Transaction History */}
      {history && history.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-150">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">History</h3>
          <div className="relative ml-2">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200 dark:bg-white/10" />
            <div className="space-y-3">
              {history.map((entry, i) => (
                <div key={entry.id} className="relative flex gap-3">
                  <div className={cn(
                    "relative z-10 mt-0.5 h-[15px] w-[15px] shrink-0 rounded-full border-2",
                    i === 0 ? "border-primary bg-primary" : "border-gray-200 bg-white dark:border-white/10 dark:bg-dark-light"
                  )}>
                    {i === 0 && <GitCommit className="absolute -bottom-[3px] -right-[3px] h-2.5 w-2.5 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {entry.note || (
                        entry.old_status
                          ? `${STATUS_LABELS[entry.old_status as keyof typeof STATUS_LABELS] ?? entry.old_status} → ${STATUS_LABELS[entry.new_status as keyof typeof STATUS_LABELS] ?? entry.new_status}`
                          : `${STATUS_LABELS[entry.new_status as keyof typeof STATUS_LABELS] ?? entry.new_status}`
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-150">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actions</h3>

        {/* Payment info */}
        {tx.status !== "awaiting_payment" && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-500/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-500/20">
              <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-green-800 dark:text-green-300">
                {formatUSD(buyerPrice)} paid by {tx.buyer?.discord_username || tx.buyer?.email?.split("@")[0] || "Buyer"}
                {tx.stripe_payment_intent_id ? " via Stripe" : ""}
              </p>
              <p className="text-[10px] text-green-600 dark:text-green-400">
                {statusTimestamps["paid"]
                  ? formatDate(statusTimestamps["paid"])
                  : tx.stripe_payment_intent_id
                    ? `Intent: ${tx.stripe_payment_intent_id.slice(0, 20)}...`
                    : "Simulated payment"}
              </p>
            </div>
            <Check className="h-4 w-4 text-green-500 dark:text-green-400 shrink-0" />
          </div>
        )}

        {/* Progress checklist — who did what, with timestamps */}
        {tx.status !== "awaiting_payment" && (
          <div className="mb-4 space-y-1.5">
            {[
              { done: tx.status !== "awaiting_payment", label: "Payment", who: tx.buyer?.discord_username || tx.buyer?.email?.split("@")[0] || "Buyer", icon: CreditCard, key: "paid" },
              { done: tx.status !== "awaiting_payment" && tx.status !== "paid", label: "Middleman Assigned", who: tx.middleman?.discord_username || tx.middleman?.email?.split("@")[0] || "Auto-assigned", icon: User, key: "mm_assigned" },
              { done: !!tx.discord_channel_id, label: "Discord Channel Created", who: tx.middleman?.discord_username || tx.middleman?.email?.split("@")[0] || "Middleman", icon: ExternalLink, key: "channel_created" },
              { done: !!tx.demo_approved, label: "Demo Approved", who: tx.buyer?.discord_username || tx.buyer?.email?.split("@")[0] || "Buyer", icon: Check, key: "demo_completed" },
              { done: tx.status === "demo_completed" || tx.status === "transfer_witnessed" || tx.status === "funds_released" || tx.status === "completed", label: "Demo Completed", who: tx.middleman?.discord_username || tx.middleman?.email?.split("@")[0] || "Middleman", icon: Check, key: "demo_completed_mm" },
              { done: tx.transfer_witnessed || tx.status === "funds_released" || tx.status === "completed", label: "Transfer Witnessed", who: tx.middleman?.discord_username || tx.middleman?.email?.split("@")[0] || "Middleman", icon: Shield, key: "transfer_witnessed" },
              { done: tx.funds_released || tx.status === "completed", label: "Funds Released", who: tx.middleman?.discord_username || tx.middleman?.email?.split("@")[0] || "Middleman", icon: CreditCard, key: "funds_released" },
            ].filter(item => item.done).map((item, i) => {
              const ts = statusTimestamps[item.key] || tx.updated_at;
              return (
                <div key={item.label} className="flex items-center gap-2.5 rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md",
                    item.done && "bg-primary/10 dark:bg-primary/20"
                  )}>
                    <item.icon className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{item.who}</span>
                  <span className="ml-auto text-[10px] tabular-nums text-gray-400 dark:text-gray-500">{formatDate(ts)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          {/* Buyer: Pay */}
          {isBuyer && tx.status === "awaiting_payment" && (
            <>
              {showPayment ? (
                <div className="w-full">
                  <StripeCheckout
                    transactionId={tx.id}
                    amountUsd={tx.amount_usd}
                    onSuccess={() => {
                      handleAction({ status: "paid" }, "Confirm payment? This will assign a middleman.");
                      setShowPayment(false);
                    }}
                    onCancel={() => setShowPayment(false)}
                  />
                </div>
              ) : (
                <div className="flex w-full flex-wrap gap-2.5">
                  <button
                    onClick={() => setShowPayment(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-md hover:shadow-primary/25"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Pay with Card
                  </button>
                  <button
                    onClick={() => handleAction({ status: "paid" }, "Simulate payment? This will assign a middleman.")}
                    disabled={updateTx.isPending}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-dark-light dark:text-gray-300 dark:hover:bg-white/5"
                    title="Skip payment for testing"
                  >
                    Simulate Payment
                  </button>
                </div>
              )}
            </>
          )}

          {/* Buyer: Approve Demo */}
          {isBuyer && tx.status === "channel_created" && !tx.demo_approved && (
            <button
              onClick={() => handleAction({ demo_approved: true, status: "demo_completed" }, "Approve the demo? This confirms you're satisfied with the account.")}
              disabled={updateTx.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />Approve Demo
            </button>
          )}

          {/* Middleman: Create Discord */}
          {isMiddleman && (tx.status === "mm_assigned" || tx.discord_channel_id === "pending" || tx.discord_channel_id === "manual") && (
            <button
              onClick={() => handleAction({ status: "channel_created", discord_channel_id: "pending" }, "Create a Discord channel for this transaction?")}
              disabled={updateTx.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />Create Discord Channel
            </button>
          )}

          {/* Middleman: Mark Demo Done */}
          {isMiddleman && tx.status === "channel_created" && tx.demo_approved && (
            <button
              onClick={() => handleAction({ status: "demo_completed" }, "Mark demo as completed?")}
              disabled={updateTx.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-teal-600/20 transition-all hover:bg-teal-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />Mark Demo Completed
            </button>
          )}

          {/* Middleman: Transfer Witnessed */}
          {isMiddleman && tx.status === "demo_completed" && !tx.transfer_witnessed && (
            <button
              onClick={() => handleAction({ transfer_witnessed: true, status: "transfer_witnessed" }, "Confirm you witnessed the transfer?")}
              disabled={updateTx.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary-dark disabled:opacity-50"
            >
              <Shield className="h-3.5 w-3.5" />Mark Transfer Witnessed
            </button>
          )}

          {/* Middleman: Release Funds */}
          {isMiddleman && tx.status === "transfer_witnessed" && !tx.funds_released && (
            <button
              onClick={() => handleAction({ funds_released: true, status: "funds_released" }, "Release funds to seller? This cannot be undone.")}
              disabled={updateTx.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              <CreditCard className="h-3.5 w-3.5" />Release Funds
            </button>
          )}

          {/* Middleman: Mark Completed */}
          {isMiddleman && tx.funds_released && tx.status !== "completed" && (
            <button
              onClick={() => handleAction({ status: "completed" }, "Mark transaction as fully completed?")}
              disabled={updateTx.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />Mark Completed
            </button>
          )}

          {/* Report Issue */}
          {(isBuyer || isSeller) && tx.status !== "completed" && tx.status !== "disputed" && (
            <button
              onClick={() => handleAction({ status: "disputed" }, "Flag this transaction for admin review?")}
              disabled={updateTx.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50 dark:border-red-500/20 dark:bg-dark-light dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <AlertTriangle className="h-3.5 w-3.5" />Report Issue
            </button>
          )}

          {/* Completed */}
          {tx.status === "completed" && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Transaction completed successfully!</p>
            </div>
          )}

          {/* Disputed */}
          {tx.status === "disputed" && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 dark:bg-red-500/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-xs font-bold text-red-700 dark:text-red-400">This transaction has been flagged for admin review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
