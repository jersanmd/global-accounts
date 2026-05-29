import { useAuth } from "@/contexts/AuthContext";
import { useBuyerTransactions } from "@/hooks/useTransactions";
import { useListings } from "@/hooks/useListings";
import { useWallet } from "@/hooks/useWallet";
import { Link } from "react-router-dom";
import { formatUSD, formatDate, timeAgo, cn, calcSellerPayout } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Transaction, Listing, Profile } from "@/lib/types";
import { WithdrawalHistory } from "@/components/WithdrawalHistory";
import {
  Package, DollarSign, ArrowUpRight,
  Clock, Plus, ShoppingBag, Gamepad2, Shield,
  ChevronRight, ChevronLeft, ChevronDown, Sparkles, Eye, MessageSquare, Pencil, Trash2, AlertTriangle,
  Search, Wallet
} from "lucide-react";

type TransactionFull = Transaction & {
  listing: Listing & { seller: Profile };
  buyer: Profile;
  middleman: Profile | null;
};

export function Dashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [sellerFilter, setSellerFilter] = useState<"all" | "completed" | "pending" | "active">("all");
  const [revenuePeriod, setRevenuePeriod] = useState<"month" | "year" | "all">("all");
  const [listingsLimit, setListingsLimit] = useState(4);
  const [salesLimit, setSalesLimit] = useState(10);

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

  // Seller listings (paginated)
  const { data: myListings, isLoading: listingsLoading } = useListings({
    sellerId: profile?.id,
    limit: listingsLimit + 1, // +1 to detect if there are more
  });
  const hasMoreListings = (myListings?.length ?? 0) > listingsLimit;
  const displayedListings = myListings?.slice(0, listingsLimit) ?? [];

  // Wallet balance
  const { balance } = useWallet(user?.id);

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
        .in("listing_id", ids).order("created_at", { ascending: false }).limit(100);
      return (data as TransactionFull[]) ?? [];
    },
    enabled: !!user && profile?.role === "seller",
    staleTime: 0,
    refetchOnMount: true,
  });

  // Computed stats
  const pendingEarnings = sellerTxns?.filter(t => !t.funds_released && t.status !== "awaiting_payment").reduce((s, t) => s + calcSellerPayout(t.amount_usd), 0) ?? 0;

  // Period filter helper
  const isInPeriod = (date: string) => {
    const now = new Date();
    const d = new Date(date);
    if (revenuePeriod === "month") return d >= new Date(now.getFullYear(), now.getMonth(), 1);
    if (revenuePeriod === "year") return d >= new Date(now.getFullYear(), 0, 1);
    return true;
  };

  const periodRevenue = sellerTxns?.filter(t => isInPeriod(t.created_at)).reduce((s, t) => s + t.amount_usd, 0) ?? 0;

  const periodReleased = sellerTxns
    ?.filter(t => isInPeriod(t.created_at) && t.funds_released)
    .reduce((s, t) => s + calcSellerPayout(t.amount_usd), 0) ?? 0;

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

  // Apply seller filter + period filter for Recent Sales
  const filteredTxns = (() => {
    let txns = allTxns.filter(tx => isInPeriod(tx.created_at));
    if (profile?.role === "seller" && sellerFilter !== "all") {
      txns = txns.filter(tx => {
        if (sellerFilter === "completed") return tx.status === "completed" && tx._type === "sell";
        if (sellerFilter === "pending") return tx._type === "sell" && !["completed", "disputed", "awaiting_payment"].includes(tx.status);
        if (sellerFilter === "active") return tx._type === "sell";
        return true;
      });
    }
    return txns;
  })();

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

      {/* Seller Stats — Finance Dashboard */} 
      {profile?.role === "seller" && (
        <div className="animate-fade-in-up delay-75 space-y-4">
          {/* KPI Cards Row */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Revenue */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-dark-light">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Revenue</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-gray-900 dark:text-white">{formatUSD(periodRevenue)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10"><DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
              </div>
              <div className="mt-3 flex gap-1">
                {[
                  { key: "month" as const, label: "Month" },
                  { key: "year" as const, label: "Year" },
                  { key: "all" as const, label: "All" },
                ].map(p => (
                  <button key={p.key} onClick={() => setRevenuePeriod(p.key)}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
                      revenuePeriod === p.key
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                        : "text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/5"
                    }`}
                  >{p.label}</button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">Total sales · 8% platform fee applies</p>
            </div>

            {/* Released (Net) */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-dark-light">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Released</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">{formatUSD(periodReleased)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10"><ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
              </div>
              <div className="mt-3 flex gap-1">
                {[
                  { key: "month" as const, label: "Month" },
                  { key: "year" as const, label: "Year" },
                  { key: "all" as const, label: "All" },
                ].map(p => (
                  <button key={p.key} onClick={() => setRevenuePeriod(p.key)}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
                      revenuePeriod === p.key
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/5"
                    }`}
                  >{p.label}</button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{sellerTxns?.filter(t => isInPeriod(t.created_at) && t.funds_released).length ?? 0} sales · 92% of revenue</p>
              {pendingEarnings > 0 && <div className="mt-2 flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"><Clock className="h-3 w-3" />{formatUSD(pendingEarnings)} in escrow</div>}
            </div>

            {/* Wallet */}
            <Link to="/profile" state={{ tab: "earnings" }} className="group relative text-left overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-emerald-500/20 dark:from-emerald-500/5 dark:to-dark-light">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Wallet</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">{formatUSD(balance)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/10"><Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Cash out <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">Ready to withdraw</p>
            </Link>
          </div>
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
                  {tx.listing?.title || tx.listing?.game || tx.listing_id?.slice(0, 8)}
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

      {/* Main Content — Finance Layout */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: Seller listings */}
        {profile?.role === "seller" ? (
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                My Listings{displayedListings.length > 0 ? ` (${displayedListings.length}${hasMoreListings ? "+" : ""})` : ""}
              </h2>
              <div className="flex items-center gap-2">
                {displayedListings.length > 0 && (
                  <Link to="/my-listings" className="text-[11px] font-semibold text-primary hover:text-primary-dark">View All</Link>
                )}
                <Link to="/create-listing" className="text-[11px] font-semibold text-primary hover:text-primary-dark"><Plus className="inline h-3 w-3 mr-0.5" />New</Link>
              </div>
            </div>
            {listingsLoading ? (
              <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-[88px] animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}</div>
            ) : displayedListings.length > 0 ? (
              <div className="space-y-2">
                {displayedListings.map((l) => (
                  <div key={l.id} className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md dark:border-white/5 dark:bg-dark-light dark:hover:border-white/10">
                    <Link to={`/listings/${l.id}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
                      {l.screenshots_urls?.[0] ? <img src={l.screenshots_urls[0]} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center"><Gamepad2 className="h-5 w-5 text-gray-300" /></div>}
                    </Link>
                    <Link to={`/listings/${l.id}`} className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-gray-900 truncate dark:text-white">{l.title || l.game}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{l.game}{l.platform ? ` · ${l.platform}` : ""}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/5 dark:text-gray-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${l.status === "active" ? "bg-emerald-400" : "bg-gray-300"}`} />{l.status === "active" ? "Active" : "Paused"}
                        </span>
                        {typeof l.stock === "number" && <span className="text-[10px] text-gray-400 dark:text-gray-500">{l.stock} left</span>}
                      </div>
                    </Link>
                    <div className="shrink-0 text-right">
                      <Link to={`/listings/${l.id}`}><p className="text-sm font-extrabold tabular-nums text-gray-900 dark:text-white">{formatUSD(l.price_usd)}</p></Link>
                      <div className="mt-1 flex items-center gap-0.5 justify-end">
                        <Link to={`/create-listing?edit=${l.id}`} className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-400" title="Edit"><Pencil className="h-3 w-3" /></Link>
                        <button onClick={() => setConfirmDeleteId(l.id)} className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400" title="Delete"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                    {confirmDeleteId === l.id && (
                      <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl bg-white/95 backdrop-blur-sm dark:bg-dark-light/95">
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-xs font-bold text-red-700 dark:text-red-400">Delete?</span></div>
                        <button onClick={() => { setDeletingId(l.id); deleteMutation.mutate(l.id); }} disabled={deletingId === l.id} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">{deletingId === l.id ? "Deleting…" : "Yes"}</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-dark-light dark:text-gray-300 dark:hover:bg-white/5">Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
                {hasMoreListings && (
                  <button onClick={() => setListingsLimit(l => l + 4)}
                    className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-2.5 text-[11px] font-semibold text-gray-400 transition-all hover:border-gray-300 hover:text-gray-600 dark:border-white/10 dark:hover:border-white/20 dark:hover:text-gray-400">
                    Load more listings <ChevronDown className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-white/5 dark:bg-dark-light">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5"><Package className="h-6 w-6 text-gray-300 dark:text-gray-600" /></div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No listings yet</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Create your first listing to start selling</p>
                <Link to="/create-listing" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark"><Plus className="h-3.5 w-3.5" />Create Listing</Link>
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

        {/* Right: Sales Table */}
        <div className="space-y-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                Recent {profile?.role === "seller" ? "Sales" : "Transactions"}
              </h2>
              {profile?.role === "seller" && revenuePeriod !== "all" && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  {revenuePeriod === "month" ? "This Month" : "This Year"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {allTxns.length > 0 && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold tabular-nums text-gray-500 dark:bg-white/5 dark:text-gray-400">{filteredTxns.length}</span>
              )}
            </div>
          </div>
          {/* Filter Chips + Period Toggle — sellers only */}
          {profile?.role === "seller" && (
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">{(() => {
                const periodTxns = sellerTxns?.filter(t => isInPeriod(t.created_at)) ?? [];
                return [
                  { key: "all", label: "All" },
                  { key: "completed", label: `Completed (${periodTxns.filter(t => t.status === "completed").length})` },
                  { key: "pending", label: `Pending (${periodTxns.filter(t => !["completed","disputed","awaiting_payment"].includes(t.status)).length})` },
                ].map(f => (
                  <button key={f.key} onClick={() => setSellerFilter(f.key as typeof sellerFilter)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      sellerFilter === f.key
                        ? "bg-primary/10 text-primary dark:bg-primary/20"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                    }`}
                  >{f.label}</button>
                ));
              })()}
              </div>
              {/* Period Toggle */}
              <div className="flex gap-1">
                {[
                  { key: "month" as const, label: "Month" },
                  { key: "year" as const, label: "Year" },
                  { key: "all" as const, label: "All" },
                ].map(p => (
                  <button key={p.key} onClick={() => setRevenuePeriod(p.key)}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
                      revenuePeriod === p.key
                        ? "bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                        : "text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/5"
                    }`}
                  >{p.label}</button>
                ))}
              </div>
            </div>
          )}
          {txLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-[52px] animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}</div>
          ) : filteredTxns.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/5 dark:bg-dark-light">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-gray-100 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:border-white/5 dark:text-gray-500">
                <div className="col-span-4">Transaction</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Fee</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {/* Table Rows */}
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {filteredTxns.slice(0, salesLimit).map((tx) => (
                  <Link key={tx.id} to={`/transactions/${tx.id}`}
                    className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 transition-all hover:bg-gray-50/50 dark:hover:bg-white/[0.02] group">
                    {/* Transaction */}
                    <div className="col-span-4 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate dark:text-white">{tx.listing?.title || tx.listing?.game || "Transaction"}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{tx.listing?.game || ""}{tx.listing?.platform ? ` · ${tx.listing.platform}` : ""}</p>
                    </div>
                    {/* Date */}
                    <div className="col-span-2">
                      <p className="text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-400">{timeAgo(tx.created_at)}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    </div>
                    {/* Status */}
                    <div className="col-span-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        tx.status === "completed" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                        tx.status === "funds_released" ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" :
                        tx.status === "disputed" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" :
                        "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full",
                          tx.status === "completed" ? "bg-emerald-400" :
                          tx.status === "funds_released" ? "bg-green-400" :
                          tx.status === "disputed" ? "bg-red-400" :
                          "bg-amber-400"
                        )} />
                        {STATUS_LABELS[tx.status as keyof typeof STATUS_LABELS] ?? tx.status}
                      </span>
                    </div>
                    {/* Fee */}
                    <div className="col-span-2">
                      {tx._type === "sell" ? (
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">{formatUSD(tx.amount_usd)} gross</p>
                          <p className="text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatUSD(calcSellerPayout(tx.amount_usd))} net</p>
                        </div>
                      ) : (
                        <p className="text-[10px] font-semibold tabular-nums text-gray-400 dark:text-gray-500">—</p>
                      )}
                    </div>
                    {/* Amount */}
                    <div className="col-span-2 text-right">
                      <p className={cn("text-sm font-extrabold tabular-nums",
                        tx._type === "sell" && tx.funds_released ? "text-emerald-600 dark:text-emerald-400" :
                        tx._type === "sell" ? "text-amber-600 dark:text-amber-400" :
                        "text-gray-900 dark:text-white"
                      )}>{formatUSD(tx.amount_usd)}</p>
                      {tx._type === "sell" && (
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                          {tx.funds_released ? "Released" : "Escrow"}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {filteredTxns.length > salesLimit && (
                <button onClick={() => setSalesLimit(l => l + 10)}
                  className="flex w-full items-center justify-center gap-1 border-t border-gray-50 py-3 text-[11px] font-semibold text-gray-400 transition-all hover:bg-gray-50/50 hover:text-gray-600 dark:border-white/5 dark:hover:bg-white/[0.02] dark:hover:text-gray-400">
                  Load more sales <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-white/5 dark:bg-dark-light">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5"><Sparkles className="h-7 w-7 text-gray-300 dark:text-gray-600" /></div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{sellerFilter !== "all" ? "No matching sales" : "No transactions yet"}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sellerFilter !== "all" ? "Try clearing the filter" : "Your purchases and sales will appear here"}</p>
              {sellerFilter !== "all" ? (
                <button onClick={() => setSellerFilter("all")} className="mt-4 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark">Clear Filter</button>
              ) : (
                <Link to="/" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark"><ShoppingBag className="h-3.5 w-3.5" />Start Browsing</Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal History — sellers only */}
      {profile?.role === "seller" && (
        <WithdrawalHistory />
      )}
    </div>
  );
}
