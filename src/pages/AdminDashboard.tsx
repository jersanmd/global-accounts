import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import type { Profile, Transaction, Listing } from "@/lib/types";
import { formatUSD, formatDate, timeAgo } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";
import {
  Users, ArrowUpDown, ShoppingBag, Wallet,
  BarChart3, CheckCircle, XCircle, Clock, AlertTriangle,
  Search, RefreshCw, Trash2,
  DollarSign
} from "lucide-react";

type Tab = "overview" | "users" | "transactions" | "listings";

const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  paid: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  mm_assigned: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  channel_created: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
  demo_completed: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20",
  transfer_witnessed: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20",
  funds_released: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  disputed: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
};

const ROLE_COLORS: Record<string, string> = {
  buyer: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
  seller: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  middleman: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  admin: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const KYC_COLORS: Record<string, string> = {
  not_verified: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const LISTING_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  sold: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
};

export function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();

  // Defense-in-depth: re-verify admin role client-side
  if (authLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>;
  }
  if (profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const [tab, setTab] = useState<Tab>("overview");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [activityLimit, setActivityLimit] = useState(10);

  const fetchAll = async () => {
    setLoading(true);
    const [txRes, userRes, listRes] = await Promise.all([
      supabase.from("transactions").select("*, listing:listings(game, platform, rank, seller_id), buyer:profiles!transactions_buyer_id_fkey(email, discord_username), middleman:profiles!transactions_middleman_id_fkey(email, discord_username)").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("listings").select("*, seller:profiles!listings_seller_id_fkey(email, discord_username)").order("created_at", { ascending: false }).limit(500),
    ]);
    setTransactions((txRes.data as any[]) ?? []);
    setUsers((userRes.data as Profile[]) ?? []);
    setListings((listRes.data as Listing[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ─── Computed Stats ───
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

  const stats = useMemo(() => {
    const buyerCount = users.filter(u => u.role === "buyer").length;
    const sellerCount = users.filter(u => u.role === "seller").length;
    const mmCount = users.filter(u => u.role === "middleman").length;
    const activeListings = listings.filter(l => l.status === "active").length;
    const soldListings = listings.filter(l => l.status === "sold").length;
    const completedTxns = transactions.filter(t => t.status === "completed");
    const disputedTxns = transactions.filter(t => t.status === "disputed");
    const activeTxns = transactions.filter(t => !["completed", "disputed"].includes(t.status));
    const todayTxns = transactions.filter(t => t.created_at >= todayStart);
    const weekTxns = transactions.filter(t => t.created_at >= weekStart);
    const totalRevenue = completedTxns.reduce((s, t) => s + t.amount_usd, 0);
    const todayRevenue = todayTxns.filter(t => t.status === "completed").reduce((s, t) => s + t.amount_usd, 0);
    const avgTxValue = completedTxns.length > 0 ? totalRevenue / completedTxns.length : 0;
    const disputeRate = transactions.length > 0 ? (disputedTxns.length / transactions.length * 100) : 0;

    return {
      buyerCount, sellerCount, mmCount, activeListings, soldListings,
      completedTxCount: completedTxns.length, activeTxCount: activeTxns.length,
      disputedCount: disputedTxns.length,
      totalRevenue, todayRevenue, avgTxValue, disputeRate,
      todayTxCount: todayTxns.length, weekTxCount: weekTxns.length,
      pendingKyc: users.filter(u => u.kyc_status === "pending").length,
      totalUsers: users.length,
    };
  }, [users, listings, transactions]);

  // ─── Filtered Data ───
  const filteredTxns = useMemo(() => {
    let data = [...transactions];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(t => t.id.includes(q) || t.status.includes(q) || String(t.amount_usd).includes(q));
    }
    if (statusFilter !== "all") data = data.filter(t => t.status === statusFilter);
    return data;
  }, [transactions, search, statusFilter]);

  const filteredUsers = useMemo(() => {
    let data = [...users];
    if (search) data = data.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) || u.discord_username?.toLowerCase().includes(search.toLowerCase()) || u.discord_id?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all" && statusFilter.startsWith("kyc_")) {
      data = data.filter(u => u.kyc_status === statusFilter.replace("kyc_", ""));
    }
    return data;
  }, [users, search, statusFilter]);

  const filteredListings = useMemo(() => {
    let data = [...listings];
    if (search) data = data.filter(l => l.game?.toLowerCase().includes(search.toLowerCase()) || l.platform?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") data = data.filter(l => l.status === statusFilter);
    return data;
  }, [listings, search, statusFilter]);

  // ─── Actions ───
  const handleRoleChange = async (userId: string, role: string, currentRole: string) => {
    if (role === "admin" && !confirm("Make this user an admin? They will have full access.")) return;
    if (!confirm(`Change role from "${currentRole}" to "${role}"?`)) return;
    await (supabase.from("profiles") as any).update({ role }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as any } : u));
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete user "${email}"?\n\nThis action cannot be undone.`)) return;
    if (!confirm("Are you absolutely sure? This removes all their data.")) return;
    await supabase.from("profiles").delete().eq("id", userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleToggleBan = async (userId: string, disabled: boolean, email: string) => {
    const action = disabled ? "enable" : "disable";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${email}"?`)) return;
    await (supabase.from("profiles") as any).update({ disabled: !disabled }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, disabled: !disabled } : u));
  };

  const handleKycAction = async (userId: string, status: string, email: string) => {
    const label = status === "approved" ? "approve" : status === "rejected" ? "reject" : `set to "${status}"`;
    if (!confirm(`Confirm: ${label} KYC for "${email}"?`)) return;
    await (supabase.from("profiles") as any).update({ kyc_status: status }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, kyc_status: status as any } : u));
  };

  const handleTxStatus = async (txId: string, status: string) => {
    if (!confirm(`Change transaction status to "${status}"?`)) return;
    await (supabase.from("transactions") as any).update({ status }).eq("id", txId);
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status } : t));
  };

  const handleTxFunds = async (txId: string, fundsReleased: boolean) => {
    const action = fundsReleased ? "release funds" : "hold funds";
    if (!confirm(`Confirm: ${action} for this transaction?`)) return;
    await (supabase.from("transactions") as any).update({ funds_released: fundsReleased }).eq("id", txId);
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, funds_released: fundsReleased } : t));
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm("⚠️ Permanently delete this transaction? This cannot be undone.")) return;
    if (!confirm("Are you absolutely sure? All related data will be lost.")) return;
    await (supabase as any).rpc("admin_delete_transaction", { p_tx_id: txId });
    setTransactions(prev => prev.filter(t => t.id !== txId));
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Delete this listing permanently?")) return;
    await supabase.from("listings").delete().eq("id", id);
    setListings(prev => prev.filter(l => l.id !== id));
  };

  const handleToggleListing = async (id: string, disabled: boolean) => {
    const action = disabled ? "enable" : "disable";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this listing?`)) return;
    await (supabase.from("listings") as any).update({ disabled: !disabled }).eq("id", id);
    setListings(prev => prev.map(l => l.id === id ? { ...l, disabled: !disabled } : l));
  };

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "transactions", label: "Transactions", icon: ArrowUpDown },
    { id: "listings", label: "Listings", icon: ShoppingBag },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Admin Panel</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-dark-light dark:text-gray-300 dark:hover:bg-white/5">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {/* Stats Grid — with animated bars */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Users", value: stats.totalUsers, sub: `${stats.buyerCount}B · ${stats.sellerCount}S · ${stats.mmCount}M`, icon: Users, color: "bg-blue-50 dark:bg-blue-500/10", barColor: "bg-blue-400", segments: [
            { v: stats.buyerCount, c: "bg-gray-300 dark:bg-gray-600" }, { v: stats.sellerCount, c: "bg-orange-400" }, { v: stats.mmCount, c: "bg-purple-400" }, { v: users.filter(u => u.role === "admin").length, c: "bg-red-400" }
          ]},
          { label: "Transactions", value: stats.activeTxCount + stats.completedTxCount, sub: `${stats.completedTxCount} completed · ${stats.disputedCount} disputed`, icon: ArrowUpDown, color: "bg-purple-50 dark:bg-purple-500/10", barColor: "bg-purple-400", segments: [
            { v: stats.completedTxCount, c: "bg-emerald-400" }, { v: stats.activeTxCount, c: "bg-amber-400" }, { v: stats.disputedCount, c: "bg-red-400" }
          ]},
          { label: "Listings", value: `${stats.activeListings} / ${stats.activeListings + stats.soldListings}`, sub: `${stats.soldListings} sold`, icon: ShoppingBag, color: "bg-orange-50 dark:bg-orange-500/10", barColor: "bg-orange-400", segments: [
            { v: stats.activeListings, c: "bg-green-400" }, { v: stats.soldListings, c: "bg-gray-300 dark:bg-gray-600" }
          ]},
          { label: "Revenue", value: formatUSD(stats.totalRevenue), sub: `${formatUSD(stats.todayRevenue)} today`, icon: DollarSign, color: "bg-green-50 dark:bg-green-500/10", barColor: "bg-green-400", segments: [
            { v: stats.todayRevenue, c: "bg-green-400" }, 
          ]},
        ].map((s, si) => (
          <div key={s.label} className={`group overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-dark-light dark:hover:border-white/15 animate-fade-in-up`}
            style={{ animationDelay: `${si * 0.1}s` }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white animate-scale-in" style={{ animationDelay: `${si * 0.1 + 0.2}s` }}>{s.value}</p>
            </div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{s.label}</p>
            {/* Segmented bar — animated fill */}
            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              {s.segments.map((seg, i) => {
                const total = s.segments.reduce((a, b) => a + b.v, 0) || 1;
                const pct = Math.max((seg.v / total) * 100, 2);
                return (
                  <div
                    key={i}
                    className={`h-full animate-bar-fill ${seg.c}`}
                    style={{ "--bar-width": `${pct}%`, animationDelay: `${si * 0.1 + i * 0.15 + 0.3}s` } as React.CSSProperties}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-white/8 animate-fade-in-up delay-100">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setStatusFilter("all"); setActivityFilter("all"); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm dark:bg-dark-light dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            }`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab !== "overview" && (
        <div className="flex gap-3 animate-fade-in-up delay-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-white/10 dark:bg-dark-light dark:text-white dark:placeholder:text-gray-500" />
          </div>
          {tab === "transactions" && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 dark:border-white/10 dark:bg-dark-light dark:text-gray-300">
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          {tab === "users" && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 dark:border-white/10 dark:bg-dark-light dark:text-gray-300">
              <option value="all">All Roles</option>
              <option value="kyc_pending">KYC Pending</option>
              <option value="kyc_approved">KYC Approved</option>
              <option value="kyc_rejected">KYC Rejected</option>
            </select>
          )}
          {tab === "listings" && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 dark:border-white/10 dark:bg-dark-light dark:text-gray-300">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <>
          {/* ─── Overview ─── */}
          {tab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Transaction Status */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2 dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-150">
                <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">Transaction Status</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => {
                    const count = transactions.filter(t => t.status === status).length;
                    return (
                      <div key={status} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          status === "completed" ? "bg-emerald-400" :
                          status === "disputed" ? "bg-red-400" :
                          status === "paid" ? "bg-blue-400" :
                          status === "awaiting_payment" ? "bg-amber-400" :
                          status === "mm_assigned" ? "bg-purple-400" :
                          status === "funds_released" ? "bg-green-400" :
                          "bg-gray-400"
                        }`} />
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{count}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Breakdown — Horizontal Bars */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-200">
                <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">Users by Role</h3>
                <div className="space-y-4">
                  {[
                    { label: "Buyers", count: stats.buyerCount, color: "bg-gray-400 dark:bg-gray-500", max: users.length || 1 },
                    { label: "Sellers", count: stats.sellerCount, color: "bg-orange-400", max: users.length || 1 },
                    { label: "Middlemen", count: stats.mmCount, color: "bg-purple-400", max: users.length || 1 },
                    { label: "Admins", count: users.filter(u => u.role === "admin").length, color: "bg-red-400", max: users.length || 1 },
                  ].map((item, i) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-20 text-[11px] font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                      <div className="flex-1 h-5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full animate-bar-fill ${item.color}`}
                          style={{ "--bar-width": `${Math.max((item.count / item.max) * 100, 2)}%`, animationDelay: `${i * 0.1 + 0.3}s` } as React.CSSProperties} />
                      </div>
                      <span className="w-7 text-right text-[11px] font-bold text-gray-700 dark:text-gray-300 tabular-nums">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* KYC */}
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-300">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">KYC Status</h3>
                <div className="space-y-3">
                  {[
                    { label: "Approved", count: users.filter(u => u.kyc_status === "approved").length, color: "bg-green-400", max: users.length || 1 },
                    { label: "Pending", count: stats.pendingKyc, color: "bg-amber-400", max: users.length || 1 },
                    { label: "Rejected", count: users.filter(u => u.kyc_status === "rejected").length, color: "bg-red-400", max: users.length || 1 },
                    { label: "Not Verified", count: users.filter(u => u.kyc_status === "not_verified").length, color: "bg-gray-400 dark:bg-gray-500", max: users.length || 1 },
                  ].map((item, i) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-20 text-[11px] font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                      <div className="flex-1 h-5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full animate-bar-fill ${item.color}`}
                          style={{ "--bar-width": `${Math.max((item.count / item.max) * 100, 2)}%`, animationDelay: `${i * 0.1 + 0.3}s` } as React.CSSProperties} />
                      </div>
                      <span className="w-7 text-right text-[11px] font-bold text-gray-700 dark:text-gray-300 tabular-nums">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2 dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-400">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recent Activity</h3>
                  <div className="flex gap-0.5 rounded-md bg-gray-100 p-0.5 dark:bg-white/8">
                    {(["all", "tx", "listing", "user"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setActivityFilter(f)}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold transition-all ${
                          activityFilter === f ? "bg-white text-gray-900 shadow-sm dark:bg-dark-light dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        {f === "all" ? "All" : f === "tx" ? "Txs" : f === "listing" ? "Listings" : "Users"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    ...(activityFilter === "all" || activityFilter === "tx" ? transactions.slice(0, 5).map(t => ({ type: "tx" as const, data: t, time: t.created_at })) : []),
                    ...(activityFilter === "all" || activityFilter === "listing" ? listings.slice(0, 5).map(l => ({ type: "listing" as const, data: l, time: l.created_at })) : []),
                    ...(activityFilter === "all" || activityFilter === "user" ? users.slice(0, 5).map(u => ({ type: "user" as const, data: u, time: u.created_at })) : []),
                  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, activityLimit).map((item, i) => {
                    const link = item.type === "tx" ? `/transactions/${(item.data as any).id}` : item.type === "listing" ? `/listings/${(item.data as any).id}` : `/profile/${(item.data as any).id}`;
                    const content = (
                      <div className="flex items-center gap-3">
                        {item.type === "tx" && <ArrowUpDown className="h-4 w-4 shrink-0 text-purple-500" />}
                        {item.type === "listing" && <ShoppingBag className="h-4 w-4 shrink-0 text-orange-500" />}
                        {item.type === "user" && <Users className="h-4 w-4 shrink-0 text-blue-500" />}
                        <div className="min-w-0 flex-1">
                          {item.type === "tx" && (
                            <>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{formatUSD((item.data as any).amount_usd)} — {(item.data as any).listing?.game ?? "Unknown"}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Buyer: {(item.data as any).buyer?.email?.split("@")[0] ?? "?"} · {(item.data as any).status}</p>
                            </>
                          )}
                          {item.type === "listing" && (
                            <>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{(item.data as any).game}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatUSD((item.data as any).price_usd)} · {(item.data as any).platform}</p>
                            </>
                          )}
                          {item.type === "user" && (
                            <>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{(item.data as any).email}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Role: {(item.data as any).role}</p>
                            </>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-gray-400">{timeAgo(item.time)}</span>
                      </div>
                    );
                    return link ? (
                      <Link key={i} to={link} className="flex rounded-lg bg-gray-50 p-2.5 transition-colors hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/8">
                        {content}
                      </Link>
                    ) : (
                      <div key={i} className="flex rounded-lg bg-gray-50 p-2.5 dark:bg-white/5">
                        {content}
                      </div>
                    );
                  })}
                  {[
                    ...(activityFilter === "all" || activityFilter === "tx" ? transactions : []),
                    ...(activityFilter === "all" || activityFilter === "listing" ? listings : []),
                    ...(activityFilter === "all" || activityFilter === "user" ? users : []),
                  ].length > activityLimit && (
                    <button
                      onClick={() => setActivityLimit(l => l + 10)}
                      className="w-full rounded-lg py-1.5 text-center text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                    >
                      Show more...
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Users ─── */}
          {tab === "users" && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-100">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.03]">
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Email</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Name</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Discord</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Role</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">KYC</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Rating</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Joined</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="transition-colors hover:bg-gray-50/30 dark:hover:bg-white/[0.03]">
                        <td className="px-3 py-2">
                          <Link to={`/profile/${u.id}`} className="block">
                            <p className="text-xs font-semibold text-gray-900 hover:text-primary dark:text-white dark:hover:text-primary">{u.email}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{u.id.slice(0, 10)}...</p>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-600 dark:text-gray-300">{u.discord_username || "—"}</td>
                        <td className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono">{u.discord_id || "—"}</td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value, u.role)}
                            className={`rounded-md border-0 px-2 py-1 text-[10px] font-bold ${ROLE_COLORS[u.role] ?? "bg-gray-100"}`}>
                            {["buyer", "seller", "middleman", "admin"].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          <select value={u.kyc_status} onChange={e => handleKycAction(u.id, e.target.value, u.email ?? "")}
                            className={`rounded-md border-0 px-2 py-1 text-[10px] font-bold ${KYC_COLORS[u.kyc_status] ?? "bg-gray-100"}`}>
                            <option value="not_verified">Not Verified</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleToggleBan(u.id, u.disabled, u.email ?? "")}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                              u.disabled ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400" : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400"
                            }`}>
                            {u.disabled ? "Disabled" : "Active"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center text-[11px] tabular-nums text-gray-600 dark:text-gray-300">{u.avg_rating?.toFixed(1) ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-[11px] text-gray-400 dark:text-gray-500">{formatDate(u.created_at)}</td>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDeleteUser(u.id, u.email ?? "")}
                            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400" title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Transactions ─── */}
          {tab === "transactions" && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-100">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.03]">
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">ID</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Listing</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Amount</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">MM</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Funds</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Date</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {filteredTxns.map(t => (
                      <tr key={t.id} className={`border-l-[3px] transition-colors hover:bg-gray-50/30 dark:hover:bg-white/[0.03] ${
                        t.status === "completed" ? "border-l-emerald-400 bg-emerald-50/10 dark:bg-emerald-500/[0.04]" :
                        t.status === "disputed" ? "border-l-red-400 bg-red-50/10 dark:bg-red-500/[0.04]" :
                        t.status === "awaiting_payment" ? "border-l-amber-400 bg-amber-50/10 dark:bg-amber-500/[0.04]" :
                        t.status === "paid" ? "border-l-blue-400 bg-blue-50/10 dark:bg-blue-500/[0.04]" :
                        t.status === "mm_assigned" ? "border-l-purple-400 bg-purple-50/10 dark:bg-purple-500/[0.04]" :
                        t.status === "channel_created" ? "border-l-indigo-400 bg-indigo-50/10 dark:bg-indigo-500/[0.04]" :
                        t.status === "demo_completed" ? "border-l-teal-400 bg-teal-50/10 dark:bg-teal-500/[0.04]" :
                        t.status === "transfer_witnessed" ? "border-l-cyan-400 bg-cyan-50/10 dark:bg-cyan-500/[0.04]" :
                        t.status === "funds_released" ? "border-l-green-400 bg-green-50/10 dark:bg-green-500/[0.04]" :
                        "border-l-gray-200 dark:border-l-gray-700"
                      }`}>
                        <td className="px-3 py-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                          <Link to={`/transactions/${t.id}`} className="hover:text-primary dark:hover:text-primary">{t.id.slice(0, 8)}...</Link>
                        </td>
                        <td className="px-3 py-2">
                          <Link to={`/transactions/${t.id}`} className="block">
                            <p className="text-[11px] font-semibold text-gray-900 hover:text-primary dark:text-white dark:hover:text-primary">{t.listing?.game ?? "—"}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{t.listing?.platform}{t.listing?.rank ? ` · ${t.listing.rank}` : ""}</p>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] font-bold tabular-nums text-gray-900 dark:text-white">{formatUSD(t.amount_usd)}</td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          <select value={t.status} onChange={e => handleTxStatus(t.id, e.target.value)}
                            className={`rounded-md border-0 px-1.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[t.status] ?? "bg-gray-100"}`}>
                            {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400">{t.middleman?.discord_username || t.middleman?.email?.split("@")[0] || "—"}</td>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleTxFunds(t.id, !t.funds_released)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                              t.funds_released ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400"
                            }`}>
                            {t.funds_released ? "Released" : "Held"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right text-[10px] text-gray-400 dark:text-gray-500">{formatDate(t.created_at)}</td>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          {t.status === "disputed" && (
                            <button onClick={() => handleTxStatus(t.id, "completed")}
                              className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400">Resolve</button>
                          )}
                          <button onClick={() => handleDeleteTransaction(t.id)}
                            className="ml-1 rounded-md px-2 py-0.5 text-[10px] font-bold text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-500/10 dark:hover:text-red-400" title="Delete transaction">
                            <Trash2 className="h-3 w-3 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Listings ─── */}
          {tab === "listings" && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-dark-light animate-fade-in-up delay-100">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.03]">
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Game</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Type</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Price</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Risk</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Visible</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Seller</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Created</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {filteredListings.map(l => (
                      <tr key={l.id} className="transition-colors hover:bg-gray-50/30 dark:hover:bg-white/[0.03]">
                        <td className="px-3 py-2">
                          <Link to={`/listings/${l.id}`} className="block">
                            <p className="text-[11px] font-semibold text-gray-900 hover:text-primary dark:text-white dark:hover:text-primary">{l.game}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{l.platform} · {l.rank}</p>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-400">{(l as any).listing_type === "in_game_items" ? "Items" : "Account"}</td>
                        <td className="px-3 py-2 text-right text-[11px] font-bold tabular-nums text-gray-900 dark:text-white">{formatUSD(l.price_usd)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            l.risk_rating === "low" ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" :
                            l.risk_rating === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" :
                            l.risk_rating === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" :
                            "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          }`}>{l.risk_rating}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LISTING_COLORS[l.status] ?? "bg-gray-100 dark:bg-white/5 dark:text-gray-400"}`}>{l.status}</span>
                        </td>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleToggleListing(l.id, l.disabled)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                              l.disabled ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400" : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400"
                            }`}>
                            {l.disabled ? "Hidden" : "Visible"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400">{l.seller?.discord_username || l.seller?.email?.split("@")[0] || l.seller_id?.slice(0, 8)}</td>
                        <td className="px-3 py-2 text-right text-[10px] text-gray-400 dark:text-gray-500">{formatDate(l.created_at)}</td>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDeleteListing(l.id)}
                            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {tab !== "overview" && (
            (tab === "users" && filteredUsers.length === 0) ||
            (tab === "transactions" && filteredTxns.length === 0) ||
            (tab === "listings" && filteredListings.length === 0)
          ) && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-dark-light">
              <AlertTriangle className="mx-auto h-6 w-6 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">No {tab} found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
