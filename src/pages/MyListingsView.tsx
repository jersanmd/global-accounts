import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatUSD, formatDate, timeAgo } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Package, Pencil, Trash2, AlertTriangle, Plus, ArrowLeft,
  Search, ChevronDown
} from "lucide-react";
import type { Listing } from "@/lib/types";

export function MyListingsView() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);

  const { data: allListings, isLoading } = useQuery({
    queryKey: ["my-listings-all", user?.id],
    queryFn: async (): Promise<Listing[]> => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      return (data as Listing[]) ?? [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings-all"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      setDeletingId(null);
      setConfirmDeleteId(null);
    },
    onError: () => {
      setDeletingId(null);
      setConfirmDeleteId(null);
    },
  });

  if (!user || !profile || (profile.role !== "seller" && profile.role !== "admin")) {
    navigate("/dashboard");
    return null;
  }

  const filtered = (allListings ?? []).filter(l =>
    !search || l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.game?.toLowerCase().includes(search.toLowerCase())
  );
  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">My Listings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} listing{filtered.length !== 1 ? "s" : ""} total</p>
          </div>
        </div>
        <Link to="/create-listing"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark">
          <Plus className="h-3.5 w-3.5" />New Listing
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or game..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10 dark:border-white/10 dark:bg-dark-light dark:text-white"
        />
      </div>

      {/* Listings Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-[72px] animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}</div>
      ) : visible.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/5 dark:bg-dark-light">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-gray-100 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:border-white/5 dark:text-gray-500">
            <div className="col-span-4">Listing</div>
            <div className="col-span-2">Platform</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2 text-right">Price</div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {visible.map((l) => (
              <div key={l.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 transition-all hover:bg-gray-50/50 dark:hover:bg-white/[0.02] group relative">
                {/* Listing */}
                <div className="col-span-4 min-w-0 flex items-center gap-3">
                  <Link to={`/listings/${l.id}`} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
                    {l.screenshots_urls?.[0] ? (
                      <img src={l.screenshots_urls[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-gray-300" /></div>
                    )}
                  </Link>
                  <div className="min-w-0 overflow-hidden">
                    <Link to={`/listings/${l.id}`} className="block text-[13px] font-bold text-gray-900 truncate hover:text-primary dark:text-white">{l.title || l.game}</Link>
                    <p className="text-[10px] text-gray-400 truncate dark:text-gray-500">{l.game}{l.platform ? ` · ${l.platform}` : ""}</p>
                  </div>
                </div>
                {/* Platform */}
                <div className="col-span-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{l.platform || "—"}</span>
                  {l.rank && l.rank !== "N/A" && <p className="text-[10px] text-gray-400 dark:text-gray-500">Rank: {l.rank}</p>}
                </div>
                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    l.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                    "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${l.status === "active" ? "bg-emerald-400" : "bg-gray-300"}`} />
                    {l.status === "active" ? "Active" : l.status}
                  </span>
                  {typeof l.stock === "number" && <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{l.stock} in stock</p>}
                </div>
                {/* Created */}
                <div className="col-span-2">
                  <p className="text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-400">{timeAgo(l.created_at)}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(l.created_at)}</p>
                </div>
                {/* Price + Actions */}
                <div className="col-span-2 text-right">
                  <p className="text-sm font-extrabold tabular-nums text-gray-900 dark:text-white">{formatUSD(l.price_usd)}</p>
                  <div className="mt-1 flex items-center gap-0.5 justify-end">
                    <Link to={`/create-listing?edit=${l.id}`}
                      className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-400" title="Edit">
                      <Pencil className="h-3 w-3" />
                    </Link>
                    <button onClick={() => setConfirmDeleteId(l.id)}
                      className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400" title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {/* Delete confirmation */}
                {confirmDeleteId === l.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-xl bg-white/95 backdrop-blur-sm dark:bg-dark-light/95">
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-bold text-red-700 dark:text-red-400">Delete &quot;{l.title || l.game}&quot;?</span>
                    </div>
                    <button onClick={() => { setDeletingId(l.id); deleteMutation.mutate(l.id); }}
                      disabled={deletingId === l.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                      {deletingId === l.id ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-dark-light dark:text-gray-300 dark:hover:bg-white/5">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {hasMore && (
            <button onClick={() => setLimit(l => l + 20)}
              className="flex w-full items-center justify-center gap-1 border-t border-gray-50 py-3 text-[11px] font-semibold text-gray-400 transition-all hover:bg-gray-50/50 hover:text-gray-600 dark:border-white/5 dark:hover:bg-white/[0.02] dark:hover:text-gray-400">
              Load more <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-white/5 dark:bg-dark-light">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
            <Package className="h-7 w-7 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            {search ? "No listings match your search" : "No listings yet"}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {search ? "Try a different search term" : "Create your first listing to start selling"}
          </p>
          {!search && (
            <Link to="/create-listing"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark">
              <Plus className="h-3.5 w-3.5" />Create Listing
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
