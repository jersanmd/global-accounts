import { useAuth } from "@/contexts/AuthContext";
import { useBuyerTransactions } from "@/hooks/useTransactions";
import { useListings } from "@/hooks/useListings";
import { Link } from "react-router-dom";
import { formatUSD, formatDate, timeAgo, cn, calcSellerPayout } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Transaction, Listing, Profile } from "@/lib/types";
import {
  Package, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight,
  Clock, Plus, ShoppingBag, Gamepad2, Shield, BarChart3,
  ChevronRight, ChevronLeft, Sparkles, Eye, MessageSquare, Pencil, Trash2, AlertTriangle,
  Search, Heart, BadgeCheck
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
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [sellerFilter, setSellerFilter] = useState<"all" | "completed" | "pending" | "active">("all");

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

      // Use SECURITY DEFINER RPC that returns SETOF transactions
      try {
        const { data, error } = await (supabase as any)
          .rpc("get_seller_txns", { p_seller_id: user.id });
        if (!error && Array.isArray(data) && data.length > 0) {
          const txns = data as TransactionFull[];
          // Enrich with listing data via get_listing_for_participant
          for (const tx of txns) {
            try {
              const { data: rpcData } = await (supabase as any)
                .rpc("get_listing_for_participant", { p_listing_id: tx.listing_id });
              if (rpcData) tx.listing = rpcData as any;
            } catch {}
          }
          return txns;
        }
      } catch { /* fall through */ }

      // Fallback: active listings only
      const { data: myListings } = await supabase.from("listings").select("id").eq("seller_id", user.id);
      const ids = (myListings as { id: string }[] | null)?.map(l => l.id) ?? [];
      if (ids.length === 0) return [];
      const { data } = await supabase.from("transactions")
        .select("*, listing:listings!left(*, seller:profiles!listings_seller_id_fkey(*)), buyer:profiles!transactions_buyer_id_fkey(*), middleman:profiles!transactions_middleman_id_fkey(*)")
        .in("listing_id", ids).order("created_at", { ascending: false }).limit(200);
      return (data as TransactionFull[]) ?? [];
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
  const totalEarned = sellerTxns?.filter(t => t.funds_released).reduce((s, t) => s + calcSellerPayout(t.amount_usd), 0) ?? 0;
  const pendingEarnings = sellerTxns?.filter(t => !t.funds_released && t.status !== "awaiting_payment").reduce((s, t) => s + calcSellerPayout(t.amount_usd), 0) ?? 0;
  const pendingActions = 
    (buyerTxns?.filter(t =>
      ["awaiting_payment", "paid", "mm_assigned"].includes(t.status)
    ).length ?? 0) + 
    (sellerTxns?.filter(t =>
      ["paid", "mm_assigned", "channel_created", "demo_completed", "transfer_witnessed"].includes(t.status)
    ).length ?? 0);

  // Seller-specific computed stats
  const completedSales = sellerTxns?.filter(t => t.status === "completed").length ?? 0;
  const totalRevenue = sellerTxns?.reduce((s, t) => s + t.amount_usd, 0) ?? 0;
  const avgSalePrice = completedSales > 0 ? Math.round(totalRevenue / completedSales) : 0;
  const sellerCompletedTxns = sellerTxns?.filter(t => t.status === "completed") ?? [];

  // Merge & sort all transactions (deduplicate by ID)
  const seen = new Map<string, TransactionFull & { _type: "buy" | "sell" }>();
  for (const t of (buyerTxns ?? [])) seen.set(t.id, { ...t, _type: "buy" as const });
  // Seller transactions take priority over buyer (same ID = seller context)
  for (const t of (sellerTxns ?? [])) seen.set(t.id, { ...t, _type: "sell" as const });
  const allTxns = [...seen.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const purchasedItems = buyerTxns?.filter(t => t.status === "completed").slice(0, 4) ?? [];

  // Apply seller filter for Recent Sales
  const filteredTxns = profile?.role === "seller" && sellerFilter !== "all"
    ? allTxns.filter(tx => {
        if (sellerFilter === "completed") return tx.status === "completed" && tx._type === "sell";
        if (sellerFilter === "pending") return tx._type === "sell" && !["completed", "disputed", "awaiting_payment"].includes(tx.status);
        if (sellerFilter === "active") return tx._type === "sell";
        return true;
      })
    : allTxns;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{getGreeting()}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {profile?.discord_username || user?.email?.split("@")[0] || "Trader"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-dark-light dark:text-gray-300 dark:hover:bg-white/5">
            <Eye className="h-3.5 w-3.5" />Browse All
          </Link>
          {profile?.role === "seller" && (
            <Link to="/create-listing" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-md hover:shadow-primary/25">
              <Plus className="h-3.5 w-3.5" />New Listing
            </Link>
          )}
        </div>
      </div>

      {/* Seller Stats — Clean Unified Layout */}
      {profile?.role === "seller" && (
        <div className="animate-fade-in-up delay-75">
          {/* Featured Stats Row */}
          <div className="grid gap-3 sm:grid-cols-5">
            <button onClick={() => setSellerFilter("active")} className={`group text-left overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-dark-light ${sellerFilter === "active" ? "border-primary/30 ring-1 ring-primary/20 dark:border-primary/30" : "border-gray-100 dark:border-white/10"}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Package className="h-4 w-4 text-primary" /></div>
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{listingCount}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Active Listings</p>
              <div className="mt-2 h-1 w-full rounded-full bg-gray-100 dark:bg-white/5"><div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, listingCount * 20)}%` }} /></div>
            </button>

            <button onClick={() => setSellerFilter("completed")} className={`group text-left overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-dark-light ${sellerFilter === "completed" ? "border-green-300 ring-1 ring-green-200 dark:border-green-500/30" : "border-gray-100 dark:border-white/10"}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-500/10"><BadgeCheck className="h-4 w-4 text-green-600 dark:text-green-400" /></div>
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{completedSales}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Completed Sales</p>
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{formatUSD(avgSalePrice)} avg</p>
            </button>

            <div className="group overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-dark-light">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-500/10"><ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" /></div>
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-green-700 dark:text-green-400">{formatUSD(totalEarned)}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Released ({sellerTxns?.filter(t => t.funds_released).length ?? 0})</p>
              {pendingEarnings > 0 && <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">{formatUSD(pendingEarnings)} in escrow</p>}
            </div>

            <div className="group overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-dark-light">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10"><DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{formatUSD(totalRevenue)}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">Gross sales value</p>
            </div>

            <button onClick={() => setSellerFilter("pending")} className={`group text-left overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-dark-light ${sellerFilter === "pending" ? "border-amber-300 ring-1 ring-amber-200 dark:border-amber-500/30" : "border-gray-100 dark:border-white/10"}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10"><Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{pendingActions}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Pending</p>
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{sellerTxns?.filter(t => ["paid", "mm_assigned", "channel_created"].includes(t.status)).length ?? 0} need attention</p>
            </button>
          </div>

          {/* Filter indicator */}
          {sellerFilter !== "all" && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Filtering Recent Sales by: <span className="font-bold text-primary">{sellerFilter}</span></span>
              <button onClick={() => setSellerFilter("all")} className="text-[10px] font-medium text-primary hover:underline">Clear</button>
            </div>
          )}
        </div>
      )}
      {/* Buyer: Loading State */}
      {profile?.role !== "seller" && txLoading && (
        <div className="animate-fade-in-up delay-75">
          <div className="relative overflow-hidden rounded-2xl">
            <div className="h-[420px] sm:h-[480px] w-full animate-pulse bg-gray-200 dark:bg-white/[0.04]" />
          </div>
        </div>
      )}

      {/* Buyer: Full-Screen Purchase Carousel */}
      {profile?.role !== "seller" && !txLoading && purchasedItems.length > 0 && (() => {
        const next = () => setCarouselIdx(i => (i + 1) % purchasedItems.length);
        const prev = () => setCarouselIdx(i => (i - 1 + purchasedItems.length) % purchasedItems.length);
        const tx = purchasedItems[carouselIdx];
        const imageUrl = tx.listing?.screenshots_urls?.[0];
        return (
          <div className="-mx-4 sm:-mx-0 relative overflow-hidden rounded-none sm:rounded-2xl animate-fade-in-up delay-75">
            {/* Image Background */}
            <div className="relative h-[420px] sm:h-[480px] w-full">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950">
                  <Gamepad2 className="h-20 w-20 text-gray-700" />
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                <div className="mb-2 inline-flex items-center gap-1.5 self-start rounded-full bg-white/15 px-3 py-1 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">Completed Purchase</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {tx.listing?.game || tx.listing_id?.slice(0, 8)}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                    {tx.listing?.platform || "—"}
                  </span>
                  {tx.listing?.rank && (
                    <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                      {tx.listing.rank}
                    </span>
                  )}
                  <span className="text-2xl font-extrabold text-primary drop-shadow-lg">{formatUSD(tx.amount_usd)}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link to={`/transactions/${tx.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-900 shadow-lg transition-all hover:bg-white/95 hover:shadow-xl hover:scale-105">
                    <Eye className="h-4 w-4" />View Details
                  </Link>
                  <Link to="/"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-transparent px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/50">
                    <ShoppingBag className="h-4 w-4" />Browse More
                  </Link>
                </div>

                {/* Carousel Controls */}
                {purchasedItems.length > 1 && (
                  <>
                    <button onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-110 sm:left-5">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-110 sm:right-5">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Dots */}
              {purchasedItems.length > 1 && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {purchasedItems.map((_, i) => (
                    <button key={i} onClick={() => setCarouselIdx(i)}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        i === carouselIdx ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                      )} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Buyer: CTA Banner for new buyers */}
      {profile?.role !== "seller" && !txLoading && purchasedItems.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-orange-500 to-amber-500 p-8 text-center text-white shadow-lg shadow-primary/20 animate-fade-in-up delay-75">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Search className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-extrabold">Find Your Next Account</h2>
            <p className="mt-2 text-sm text-white/80">Browse verified game accounts secured by middleman protection</p>
            <Link to="/" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition-all hover:bg-white/95 hover:shadow-xl">
              <ShoppingBag className="h-4 w-4" />Start Browsing
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: Seller listings or Quick Links */}
        {profile?.role === "seller" ? (
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5"><ShoppingBag className="h-4 w-4 text-primary" /></div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">My Listings</h2>
              </div>
              {listingCount > 0 && <Link to="/" className="text-[11px] font-semibold text-primary hover:underline">View all</Link>}
            </div>
            {listingsLoading ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}</div>
            ) : myListings && myListings.length > 0 ? (
              <div className="space-y-3">
                {myListings.map((l) => (
                  <div key={l.id} className="group relative flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-dark-light">
                    <Link to={`/listings/${l.id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {l.screenshots_urls?.[0] ? <img src={l.screenshots_urls[0]} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center"><Gamepad2 className="h-6 w-6 text-gray-300" /></div>}
                    </Link>
                    <Link to={`/listings/${l.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate dark:text-white">{l.game}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{l.platform} · {l.rank}</p>
                      <span className="mt-1.5 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/5 dark:text-gray-400">{l.status === "active" ? "🟢 Active" : "⏸️ Inactive"}</span>
                    </Link>
                    <Link to={`/listings/${l.id}`} className="shrink-0 text-right"><p className="text-base font-extrabold text-primary">{formatUSD(l.price_usd)}</p></Link>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link to={`/create-listing?edit=${l.id}`} className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-300" title="Edit"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => setConfirmDeleteId(l.id)} className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {confirmDeleteId === l.id && (
                      <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl bg-white/95 backdrop-blur-sm dark:bg-dark-light/95">
                        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5 dark:bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-xs font-semibold text-red-700 dark:text-red-400">Delete?</span></div>
                        <button onClick={() => { setDeletingId(l.id); deleteMutation.mutate(l.id); }} disabled={deletingId === l.id} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50">{deletingId === l.id ? "Deleting…" : "Yes"}</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-dark-light dark:text-gray-300 dark:hover:bg-white/5">Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-dark-light">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5"><Package className="h-6 w-6 text-gray-400 dark:text-gray-500" /></div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No listings yet</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Create your first listing to start selling</p>
                <Link to="/create-listing" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-dark"><Plus className="h-3.5 w-3.5" />Create Listing</Link>
              </div>
            )}
          </div>
        ) : (
          /* Buyer: Quick Links */
          <div className="space-y-3 lg:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <span className="rounded-lg bg-gray-100 p-1 dark:bg-white/5"><Shield className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" /></span>
              Quick Links
            </h2>
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm space-y-1 p-2 dark:border-white/10 dark:bg-dark-light">
              <Link to="/" className="flex items-center gap-3 rounded-lg p-2.5 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Eye className="h-4 w-4 text-primary" /></div>
                Browse Listings <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
              </Link>
              <Link to="/profile" className="flex items-center gap-3 rounded-lg p-2.5 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/10"><Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" /></div>
                Verify Identity <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
              </Link>
              <Link to="/terms" className="flex items-center gap-3 rounded-lg p-2.5 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/10"><MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
                How It Works <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
              </Link>
            </div>
          </div>
        )}

        {/* Right: Recent Transactions */}
        <div className="space-y-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <span className="rounded-lg bg-gray-100 p-1 dark:bg-white/5"><BarChart3 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" /></span>
              Recent {profile?.role === "seller" ? "Sales" : "Transactions"}
            </h2>
            {allTxns.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-white/5 dark:text-gray-400">{filteredTxns.length}{sellerFilter !== "all" ? ` / ${allTxns.length}` : ""}</span>
            )}
          </div>
          {txLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}</div>
          ) : filteredTxns.length > 0 ? (
            <div className="space-y-2">
              {filteredTxns.slice(0, 8).map((tx) => (
                <Link key={tx.id} to={`/transactions/${tx.id}`}
                  className={cn("group flex items-center gap-3 rounded-xl border-l-[3px] bg-white p-3.5 shadow-sm transition-all hover:-translate-x-0.5 hover:shadow-md dark:bg-dark-light", STATUS_COLORS[tx.status] ?? "border-l-gray-300 dark:border-l-gray-700")}>
                  <div className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[tx.status] ?? "bg-gray-300")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900 truncate dark:text-white">{tx.listing?.game || tx.listing_id?.slice(0, 8) || "Transaction"}</p>
                      <span className={cn("inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        tx._type === "buy" ? "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400" : tx.funds_released ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400")}>
                        {tx._type === "buy" ? "Purchased" : tx.funds_released ? "Released" : "Escrow"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                      <span>{timeAgo(tx.created_at)}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>{STATUS_LABELS[tx.status as keyof typeof STATUS_LABELS] ?? tx.status}</span>
                      {tx.middleman && <><span className="text-gray-300 dark:text-gray-600">·</span><span>MM: {tx.middleman?.discord_username || tx.middleman?.email?.split("@")[0]}</span></>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xs font-extrabold tabular-nums", tx._type === "buy" ? "text-gray-700 dark:text-gray-300" : tx.funds_released ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>{formatUSD(tx.amount_usd)}</p>
                    <ChevronRight className="ml-auto mt-0.5 h-3 w-3 text-gray-300 dark:text-gray-600 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-dark-light">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5"><Sparkles className="h-6 w-6 text-gray-300 dark:text-gray-600" /></div>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{sellerFilter !== "all" ? "No matching sales" : "No transactions yet"}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sellerFilter !== "all" ? "Try clearing the filter to see all transactions" : "Your purchases and sales will appear here"}</p>
              {sellerFilter !== "all" ? (
                <button onClick={() => setSellerFilter("all")} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary-dark">Clear Filter</button>
              ) : (
                <Link to="/" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary-dark"><ShoppingBag className="h-3.5 w-3.5" />Start Browsing</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
