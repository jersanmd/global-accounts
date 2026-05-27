import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Shield, User, MessageCircle, ShoppingCart, Banknote } from "lucide-react";

export function SetupProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If profile already set up, redirect to dashboard
  if (profile?.discord_username && profile?.role !== "buyer") {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          discord_username: displayName || null,
          discord_id: discordId || null,
          role,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      await refreshProfile();
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Set Up Your Profile</h1>
          <p className="mt-2 text-sm text-gray-500">Tell us a bit about yourself to get started.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* Display Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              placeholder="How others will see you"
              required
            />
          </div>

          {/* Discord Username */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" />Discord Username</span>
            </label>
            <input
              type="text"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              placeholder="username#0000"
            />
            <p className="mt-1 text-[11px] text-gray-400">Used for middleman verification sessions.</p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-500">I want to</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                  role === "buyer"
                    ? "border-primary bg-primary-light text-primary shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-sm font-semibold">Buy Accounts</span>
                <span className="text-[10px] opacity-70">Browse & purchase</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                  role === "seller"
                    ? "border-primary bg-primary-light text-primary shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <Banknote className="h-6 w-6" />
                <span className="text-sm font-semibold">Sell Accounts</span>
                <span className="text-[10px] opacity-70">List & earn</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-shine w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Complete Setup"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          You can change these settings later in your dashboard.
        </p>
      </div>
    </div>
  );
}
