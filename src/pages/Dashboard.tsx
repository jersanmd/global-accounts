import { useAuth } from "@/contexts/AuthContext";
import { useBuyerTransactions } from "@/hooks/useTransactions";
import { useListings } from "@/hooks/useListings";
import { Link } from "react-router-dom";
import { formatUSD, formatDate, timeAgo, cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Transaction, Listing, Profile } from "@/lib/types";
import {
  Package, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight,
  Clock, Plus, ShoppingBag, Gamepad2, Shield, BarChart3,
  ChevronRight, Sparkles, Eye, MessageSquare, Pencil, Trash2, AlertTriangle
} from "lucide-react";

type TransactionFull = Transaction & {
  listing: Listing & { seller: Profile };
  buyer: Profile;
  middleman: Profile | null;
};

const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: "border-l-amber-400 bg-amber-50/50",
  paid: "border-l-blue-400 bg-blue-50/50",
  mm_assigned: "border-l-purple-400 bg-purple-50/50",
  channel_created: "border-l-indigo-400 bg-indigo-50/50",
  demo_completed: "border-l-teal-400 bg-teal-50/50",
  transfer_witnessed: "border-l-cyan-400 bg-cyan-50/50",
  funds_released: "border-l-green-400 bg-green-50/50",
  completed: "border-l-emerald-400 bg-emerald-50/50",
  disputed: "border-l-red-400 bg-red-50/50",
};

const STATUS_DOT: Record<string, string> = {
  awaiting_payment: "bg-amber-400",
  paid: "bg-blue-400",
  mm_assigned: "bg-purple-400",
  channel_created: "bg-indigo-400",
  demo_completed: "bg-teal-400",
  transfer_witnessed: "bg-cyan-400",
  funds_released: "bg-green-400",
  completed: "bg-emerald-400",
  disputed: "bg-red-400",
};

export function Dashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["game-categories"] });
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
      setDeletingId(null);
      setConfirmDeleteId(null);
    },
    onError: () => {
      setDeletingId(null);
      setConfirmDeleteId(null);
    },
  });

  // Buyer transactions
  const { data: buyerTxns, isLoading: txLoading } = useBuyerTransactions();

  // Seller listings (active)
  const { data: myListings, isLoading: listingsLoading } = useListings({
    sellerId: profile?.id,
  });

  // Seller transactions (sales)
  const { data: sellerTxns } = useQuery({
    queryKey: ["transactions", "seller", user?.id],
    queryFn: async (): Promise<TransactionFull[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*, listing:listings!inner(*, seller:profiles!listings_seller_id_fkey(*)), buyer:profiles!transactions_buyer_id_fkey(*), middleman:profiles!transactions_middleman_id_fkey(*)")
        .eq("listing.seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as TransactionFull[]) ?? [];
    },
    enabled: !!user && profile?.role === "seller",
    staleTime: 0,
    refetchOnMount: true,
  });

  // Computed stats
  const listingCount = myListings?.length ?? 0;
  const buyerTxnCount = buyerTxns?.length ?? 0;
  const sellerTxnCount = sellerTxns?.length ?? 0;
  const totalSpent = buyerTxns?.reduce((s, t) => s + t.amount_usd, 0) ?? 0;
  const totalEarned = sellerTxns?.reduce((s, t) => s + t.amount_usd, 0) ?? 0;
  const pendingActions = buyerTxns?.filter(t =>
    ["awaiting_payment", "paid", "mm_assigned"].includes(t.status)
  ).length ?? 0;

  // Merge & sort all transactions
  const allTxns = [
    ...(buyerTxns ?? []).map(t => ({ ...t, _type: "buy" as const })),
    ...(sellerTxns ?? []).map(t => ({ ...t, _type: "sell" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* ─── Welcome Header ─── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{getGreeting()}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {profile?.discord_username || user?.email?.split("@")[0] || "Trader"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Browse
          </Link>
          {profile?.role === "seller" && (
            <Link
              to="/create-listing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25"
            >
              <Plus className="h-4 w-4" />
              New Listing
            </Link>
          )}
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Listings */}
        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/5 transition-all group-hover:scale-125" />
          <div className="relative">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{listingCount}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-400">Active Listings</p>
          </div>
        </div>

        {/* Total Spent (Buyer) */}
        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-red-50 transition-all group-hover:scale-125" />
          <div className="relative">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{formatUSD(totalSpent)}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-400">
              Total Spent · {buyerTxnCount} {buyerTxnCount === 1 ? "order" : "orders"}
            </p>
          </div>
        </div>

        {/* Total Earned (Seller) */}
        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-50 transition-all group-hover:scale-125" />
          <div className="relative">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{formatUSD(totalEarned)}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-400">
              Total Earned · {sellerTxnCount} {sellerTxnCount === 1 ? "sale" : "sales"}
            </p>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-50 transition-all group-hover:scale-125" />
          <div className="relative">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{pendingActions}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-400">Pending Actions</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* ─── Left: Listings (sellers) ─── */}
        <div className={cn("space-y-4", profile?.role === "seller" ? "lg:col-span-2" : "lg:col-span-2")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <ShoppingBag className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">
                {profile?.role === "seller" ? "My Listings" : "Quick Links"}
              </h2>
            </div>
            {profile?.role === "seller" && listingCount > 0 && (
              <Link to="/" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            )}
          </div>

          {profile?.role === "seller" ? (
            listingsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
            ) : myListings && myListings.length > 0 ? (
              <div className="space-y-3">
                {myListings.map((l) => (
                  <div
                    key={l.id}
                    className="group relative flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* Thumbnail — clickable */}
                    <Link to={`/listings/${l.id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {l.screenshots_urls?.[0] ? (
                        <img
                          src={l.screenshots_urls[0]}
                          alt=""
                          className="h-full w-full object-cover transition-transform hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Gamepad2 className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </Link>
                    {/* Info — clickable */}
                    <Link to={`/listings/${l.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{l.game}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{l.platform} · {l.rank}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          {l.status === "active" ? "🟢 Active" : "⏸️ Inactive"}
                        </span>
                      </div>
                    </Link>
                    {/* Price */}
                    <Link to={`/listings/${l.id}`} className="shrink-0 text-right">
                      <p className="text-base font-extrabold text-primary">{formatUSD(l.price_usd)}</p>
                    </Link>
                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        to={`/create-listing?edit=${l.id}`}
                        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
                        title="Edit listing"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setConfirmDeleteId(l.id)}
                        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600"
                        title="Delete listing"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Delete confirmation */}
                    {confirmDeleteId === l.id && (
                      <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-2xl bg-white/95 backdrop-blur-sm">
                        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-semibold text-red-700">Delete this listing?</span>
                        </div>
                        <button
                          onClick={() => { setDeletingId(l.id); deleteMutation.mutate(l.id); }}
                          disabled={deletingId === l.id}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === l.id ? "Deleting…" : "Yes, delete"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">No listings yet</p>
                <p className="mt-1 text-xs text-gray-400">Create your first listing to start selling</p>
                <Link
                  to="/create-listing"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-dark"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Listing
                </Link>
              </div>
            )
          ) : (
            /* Quick Links card for non-sellers */
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
              <Link to="/" className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                Browse Listings
                <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
              </Link>
              <Link to="/profile" className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                Verify Identity
                <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
              </Link>
              <Link to="/terms" className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                How It Works
                <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
              </Link>
            </div>
          )}
        </div>

        {/* ─── Right: Recent Transactions ─── */}
        <div className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gray-100 p-1.5">
                <BarChart3 className="h-4 w-4 text-gray-600" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Recent Transactions</h2>
            </div>
            {allTxns.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500">
                {allTxns.length}
              </span>
            )}
          </div>

          {txLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : allTxns.length > 0 ? (
            <div className="space-y-2">
              {allTxns.slice(0, 8).map((tx) => (
                <Link
                  key={tx.id}
                  to={`/transactions/${tx.id}`}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl border-l-4 bg-white p-4 shadow-sm transition-all hover:-translate-x-1 hover:shadow-md",
                    STATUS_COLORS[tx.status] ?? "border-l-gray-300"
                  )}
                >
                  {/* Status dot */}
                  <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[tx.status] ?? "bg-gray-300")} />

                  {/* Game info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {tx.listing?.game ?? "Unknown Game"}
                      </p>
                      <span className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        tx._type === "buy"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      )}>
                        {tx._type === "buy" ? "Bought" : "Sold"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>{timeAgo(tx.created_at)}</span>
                      <span className="text-gray-300">·</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium">
                        {STATUS_LABELS[tx.status as keyof typeof STATUS_LABELS] ?? tx.status}
                      </span>
                      {tx.middleman && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>MM: {tx.middleman.email?.split("@")[0]}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-extrabold",
                      tx._type === "buy" ? "text-red-600" : "text-green-600"
                    )}>
                      {tx._type === "buy" ? "-" : "+"}{formatUSD(tx.amount_usd)}
                    </p>
                    <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 text-gray-300 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <Sparkles className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-base font-semibold text-gray-700">No transactions yet</p>
              <p className="mt-1 text-sm text-gray-400">Browse listings to find your next account</p>
              <Link
                to="/"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
              >
                <ShoppingBag className="h-4 w-4" />
                Start Browsing
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
