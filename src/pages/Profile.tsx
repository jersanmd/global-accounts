import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getAvatarUrl } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Shield, User, MessageCircle, Save, Camera, ShieldCheck, Clock, XCircle, AlertTriangle, CheckCircle, Mail, Calendar, Star, Wallet, ArrowDownToLine, Smartphone, DollarSign, CircleDollarSign } from "lucide-react";
import { useReviews } from "@/hooks/useReviews";
import { formatUSD } from "@/lib/utils";

const KYC_INFO: Record<string, { icon: typeof ShieldCheck; label: string; color: string; bg: string }> = {
  not_verified: { icon: AlertTriangle, label: "Not Verified", color: "text-gray-500", bg: "bg-gray-100" },
  pending: { icon: Clock, label: "Pending Review", color: "text-yellow-700", bg: "bg-yellow-50" },
  approved: { icon: CheckCircle, label: "Verified", color: "text-green-700", bg: "bg-green-50" },
  rejected: { icon: XCircle, label: "Rejected", color: "text-red-700", bg: "bg-red-50" },
};

export function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.discord_username ?? "");
  const [discordId, setDiscordId] = useState(profile?.discord_id ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date?.split("T")[0] ?? "");
  const [payoutMethod, setPayoutMethod] = useState("gcash");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [payoutName, setPayoutName] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "earnings">("profile");

  // Hooks must be before any early returns
  const { data: reviews } = useReviews(user?.id);
  const { data: txCount } = useQuery({
    queryKey: ["profile-tx-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const [{ count: buyerCount }, { count: sellerCount }] = await Promise.all([
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "completed"),
        supabase.from("transactions").select("*, listing:listings!inner(seller_id)", { count: "exact", head: true }).eq("listing.seller_id", user.id).eq("status", "completed"),
      ]);
      return (buyerCount ?? 0) + (sellerCount ?? 0);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Seller earnings
  const { data: earnings } = useQuery({
    queryKey: ["profile-earnings", user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, withdrawn: 0, pending: 0 };
      const { data } = await supabase
        .from("transactions")
        .select("amount_usd, funds_released, status")
        .or(`buyer_id.eq.${user.id},listing.seller_id.eq.${user.id}`);
      const txns = (data ?? []) as { amount_usd: number; funds_released: boolean; status: string }[];
      const sellerTxns = txns.filter(t => t.status === "completed");
      const total = sellerTxns.reduce((s, t) => s + t.amount_usd, 0);
      const withdrawn = sellerTxns.filter(t => t.funds_released).reduce((s, t) => s + t.amount_usd, 0);
      return { total, withdrawn, pending: total - withdrawn };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!user || !profile) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" /></div>;

  const kyc = KYC_INFO[profile.kyc_status] ?? KYC_INFO.not_verified;
  const KycIcon = kyc.icon;

  const handleSave = async () => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const { error: e } = await supabase.from("profiles").update({
        discord_username: displayName || null,
        discord_id: discordId || null,
        birth_date: birthDate || null,
      }).eq("id", user.id);
      if (e) throw e;
      await refreshProfile();
      setSaved(true); setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setLoading(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB"); return; }
    setUploading(true); setError("");
    try {
      const fileName = `${user.id}.jpg`;
      const { error: uploadError } = await supabase.storage.from("listing-screenshots").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("listing-screenshots").getPublicUrl(fileName);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleRequestKyc = async () => {
    setKycLoading(true); setError("");
    try {
      const { error: e } = await supabase.from("profiles").update({ kyc_status: "pending" }).eq("id", user.id);
      if (e) throw e;
      await refreshProfile();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to submit KYC request"); }
    finally { setKycLoading(false); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/dashboard" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"><Shield className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-extrabold tracking-tight text-gray-900">My Profile</h1><p className="text-sm text-gray-500">Manage your account & identity</p></div>
        {saved && <span className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 animate-fade-in">✓ Saved</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left — Avatar & KYC */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <div className="relative mx-auto mb-4 w-fit group">
              <img src={getAvatarUrl(user.email, profile.avatar_url, 120)} alt="" className="h-24 w-24 rounded-2xl ring-2 ring-white shadow-md object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/0 transition-all group-hover:bg-black/40">
                <Camera className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
              {uploading && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40"><div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" /></div>}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{profile.discord_username || profile.email?.split("@")[0]}</h2>
            <p className="text-xs text-gray-400">{profile.email?.slice(0, 3) + "***" + profile.email?.slice(profile.email!.indexOf("@"))}</p>
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-semibold uppercase text-primary">{profile.role}</span>

            {/* Stats */}
            <div className="mt-4 flex items-center justify-center gap-4 border-t border-gray-100 pt-4">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                  <span className="text-sm font-bold text-gray-900">{profile.avg_rating?.toFixed(1) ?? "—"}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Rating</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <span className="text-sm font-bold text-gray-900">{reviews?.length ?? 0}</span>
                <p className="text-[10px] text-gray-400 mt-0.5">Reviews</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <span className="text-sm font-bold text-gray-900">{txCount ?? 0}</span>
                <p className="text-[10px] text-gray-400 mt-0.5">Trades</p>
              </div>
            </div>
          </div>

          {/* KYC Card */}
          <div className={`rounded-2xl border p-5 shadow-sm ${kyc.bg}`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KycIcon className={`h-5 w-5 ${kyc.color}`} />
                <h3 className="text-sm font-bold text-gray-900">Identity Verification</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${kyc.bg === "bg-green-50" ? "bg-green-200 text-green-800" : kyc.bg === "bg-yellow-50" ? "bg-yellow-200 text-yellow-800" : kyc.bg === "bg-red-50" ? "bg-red-200 text-red-800" : "bg-gray-200 text-gray-700"}`}>
                {kyc.label}
              </span>
            </div>
            <p className="mb-4 text-xs text-gray-600 leading-relaxed">
              {profile.kyc_status === "not_verified" && "Verify your identity to sell accounts and receive payouts. KYC is required before your first withdrawal."}
              {profile.kyc_status === "pending" && "Your identity verification is being reviewed. This typically takes 1-3 business days."}
              {profile.kyc_status === "approved" && "Your identity has been verified. You can sell accounts and receive payouts."}
              {profile.kyc_status === "rejected" && "Your verification was rejected. Please review the reason and resubmit with correct documents."}
            </p>
            {(profile.kyc_status === "not_verified" || profile.kyc_status === "rejected") && (
              <button onClick={handleRequestKyc} disabled={kycLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" />
                {kycLoading ? "Submitting..." : profile.kyc_status === "rejected" ? "Resubmit KYC" : "Verify My Identity"}
              </button>
            )}
          </div>
        </div>

        {/* Right — Details */}
        <div className="space-y-6 lg:col-span-2">
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {/* Tab Bar */}
          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                activeTab === "profile"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <User className="mr-1.5 inline-block h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                activeTab === "earnings"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Wallet className="mr-1.5 inline-block h-4 w-4" />
              Earnings
            </button>
          </div>

          {/* Tab: Profile */}
          {activeTab === "profile" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Account Information</h3>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all">
                  <User className="h-3.5 w-3.5" />Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
                    <Save className="h-3.5 w-3.5" />{loading ? "Saving" : "Save"}
                  </button>
                  <button onClick={() => { setEditing(false); setDisplayName(profile.discord_username ?? ""); setDiscordId(profile.discord_id ?? ""); setBirthDate(profile.birth_date?.split("T")[0] ?? ""); }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <div className="rounded-lg bg-white p-2 shadow-sm"><User className="h-5 w-5 text-gray-400" /></div>
                <div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Display Name</p>
                  {editing ? <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    className="mt-0.5 w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none" placeholder="Your display name" /> :
                    <p className="text-sm font-medium text-gray-900">{profile.discord_username || <span className="text-gray-400 italic">Not set</span>}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <div className="rounded-lg bg-white p-2 shadow-sm"><MessageCircle className="h-5 w-5 text-gray-400" /></div>
                <div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Discord</p>
                  {editing ? <input type="text" value={discordId} onChange={e => setDiscordId(e.target.value)}
                    className="mt-0.5 w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none" placeholder="username#0000" /> :
                    <p className="text-sm font-medium text-gray-900">{profile.discord_id || profile.discord_username || <span className="text-gray-400 italic">Not set</span>}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <div className="rounded-lg bg-white p-2 shadow-sm"><Mail className="h-5 w-5 text-gray-400" /></div>
                <div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-500">{profile.email?.slice(0, 3) + "***" + profile.email?.slice(profile.email!.indexOf("@"))}</p></div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <div className="rounded-lg bg-white p-2 shadow-sm"><Calendar className="h-5 w-5 text-gray-400" /></div>
                <div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Age</p>
                  {editing ? (
                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none" />
                  ) : (
                    <p className="text-sm font-medium text-gray-900">
                      {profile.birth_date
                        ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + " years old"
                        : <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <div className="rounded-lg bg-white p-2 shadow-sm"><Calendar className="h-5 w-5 text-gray-400" /></div>
                <div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Member Since</p>
                  <p className="text-sm font-medium text-gray-900">{new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>
              </div>
            </div>
          </div>
          )}

          {/* Tab: Earnings */}
          {activeTab === "earnings" && (
            <>
          {profile.role === "seller" ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-green-100 p-1.5"><Wallet className="h-4 w-4 text-green-700" /></div>
                <h3 className="text-sm font-bold text-gray-900">Earnings & Withdrawals</h3>
              </div>

              {/* Balance cards */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Available</p>
                  <p className="text-lg font-extrabold text-gray-900">{formatUSD((earnings?.pending ?? 0) * 0.92)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Withdrawn</p>
                  <p className="text-lg font-extrabold text-gray-900">{formatUSD((earnings?.withdrawn ?? 0) * 0.92)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Total Earned</p>
                  <p className="text-lg font-extrabold text-primary">{formatUSD((earnings?.total ?? 0) * 0.92)}</p>
                </div>
              </div>

              {/* Payout Method Selection */}
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Payout Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "gcash", label: "GCash", icon: Smartphone, color: "bg-blue-500" },
                    { id: "maya", label: "Maya", icon: CircleDollarSign, color: "bg-green-500" },
                    { id: "paypal", label: "PayPal", icon: DollarSign, color: "bg-[#0070ba]" },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayoutMethod(m.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                        payoutMethod === m.id
                          ? "border-primary bg-primary-light shadow-sm"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <div className={`rounded-lg p-1.5 ${payoutMethod === m.id ? m.color : "bg-gray-200"} transition-colors`}>
                        <m.icon className={`h-4 w-4 ${payoutMethod === m.id ? "text-white" : "text-gray-500"}`} />
                      </div>
                      <span className={`text-xs font-semibold ${payoutMethod === m.id ? "text-primary" : "text-gray-600"}`}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout Details Input */}
              {(payoutMethod === "gcash" || payoutMethod === "maya") ? (
                <>
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Full Name</label>
                    <input
                      type="text"
                      value={payoutName}
                      onChange={e => setPayoutName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      placeholder="Juan Dela Cruz"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      {payoutMethod === "gcash" ? "GCash Number" : "Maya Number"}
                    </label>
                    <input
                      type="text"
                      value={payoutDetails}
                      onChange={e => setPayoutDetails(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      placeholder="09XX XXX XXXX"
                    />
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={e => setPaypalEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    placeholder="seller@email.com"
                  />
                </div>
              )}

              {/* Withdraw button */}
              <button
                disabled={
                  ((payoutMethod === "gcash" || payoutMethod === "maya") && (!payoutName || !payoutDetails)) ||
                  (payoutMethod === "paypal" && !paypalEmail) ||
                  (earnings?.pending ?? 0) <= 0 ||
                  profile.kyc_status !== "approved"
                }
                className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Request Withdrawal
              </button>
              {(((payoutMethod === "gcash" || payoutMethod === "maya") && (!payoutName || !payoutDetails)) || (payoutMethod === "paypal" && !paypalEmail) || profile.kyc_status !== "approved") && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  {(payoutMethod === "gcash" || payoutMethod === "maya") && !payoutName && "Enter your full name. "}
                  {payoutMethod === "gcash" && payoutName && !payoutDetails && "Enter your GCash number. "}
                  {payoutMethod === "maya" && payoutName && !payoutDetails && "Enter your Maya number. "}
                  {payoutMethod === "paypal" && !paypalEmail && "Enter your PayPal email. "}
                  {profile.kyc_status !== "approved" && "KYC verification required."}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <Wallet className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Become a Seller</h3>
              <p className="mt-1 text-sm text-gray-500">List your gaming accounts and start earning. Verify your identity to unlock seller features.</p>
              <button onClick={handleRequestKyc} disabled={kycLoading || profile.kyc_status === "pending"}
                className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark disabled:opacity-50">
                {profile.kyc_status === "not_verified" ? "Verify My Identity" : profile.kyc_status === "pending" ? "Verification Pending" : "Get Started"}
              </button>
            </div>
          )}
            </>
          )}

          {/* Sign Out */}
          <button onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-600 transition-all hover:bg-red-50">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
