import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getAvatarUrl } from "@/lib/utils";
import { Shield, ShoppingCart, LogOut, Menu, X, LayoutDashboard, Banknote, ShieldCheck, Settings, Search } from "lucide-react";
import { useSearchContext } from "@/contexts/SearchContext";
import { useState } from "react";

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useOnlineStatus();

  const { search, setSearch, heroVisible, setHeroVisible } = useSearchContext();
  const isActive = (path: string) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-dark/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 transition-colors group-hover:bg-primary/25">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Global<span className="text-primary">Account</span>
            </span>
          </Link>

          {/* Center nav - desktop */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {[
              { to: "/", label: "Browse", icon: "🎮" },
              ...(user && profile?.role === "seller" ? [{ to: "/create-listing", label: "Sell", icon: "" }] : []),
              ...(user && profile?.role === "middleman" ? [{ to: "/middleman", label: "MM Panel", icon: "" }] : []),
              ...(user && profile?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: "" }] : []),
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative px-3 py-1.5 text-sm font-medium transition-colors ${
                  label === "Admin"
                    ? "text-red-400 hover:text-red-300"
                    : isActive(to)
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {label}
                {isActive(to) && label !== "Admin" && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </nav>

          {/* Nav search — appears when hero search scrolls out */}
          {!heroVisible && location.pathname === "/" && (
            <div className="hidden flex-1 items-center justify-center px-4 md:flex">
              <div className="flex w-full max-w-md items-center gap-2 rounded-lg bg-white/6 px-3 py-1.5 ring-1 ring-white/8 transition-all focus-within:ring-primary/40">
                <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search accounts..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-gray-500 focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="shrink-0 rounded-full p-0.5 text-gray-500 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                {/* Desktop */}
                <div className="hidden items-center gap-1 md:flex">
                  <Link
                    to="/dashboard"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      isActive("/dashboard")
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>

                  <Link to="/profile" className="ml-2 flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1 hover:bg-white/8 transition-colors cursor-pointer">
                    <img
                      src={getAvatarUrl(user.email, profile?.avatar_url, 40)}
                      alt=""
                      className="h-6 w-6 rounded-full ring-1 ring-white/20"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="max-w-[80px] truncate text-xs font-medium text-gray-300">
                      {profile?.discord_username || user.email?.split("@")[0]}
                    </span>
                  </Link>

                  <button
                    onClick={() => signOut()}
                    className="rounded-lg p-2 text-gray-500 hover:bg-white/8 hover:text-gray-300 transition-all"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>

                {/* Mobile: dashboard icon */}
                <Link to="/dashboard" className="rounded-lg p-2 text-gray-400 hover:bg-white/8 hover:text-white transition-all md:hidden">
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="hidden rounded-lg px-4 py-1.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/8 hover:text-white sm:inline"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="btn-shine flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Start Selling</span>
                </button>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="ml-1 rounded-lg p-2 text-gray-400 hover:bg-white/8 hover:text-white transition-all md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-white/[0.06] bg-dark/95 backdrop-blur-xl md:hidden">
            <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
              <Link to="/" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive("/") ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}>
                🎮 Browse Listings
              </Link>
              {user && profile?.role === "seller" && (
                <Link to="/create-listing" onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive("/create-listing") ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}>
                  <Banknote className="h-4 w-4" /> Sell Account
                </Link>
              )}
              {user && profile?.role === "middleman" && (
                <Link to="/middleman" onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive("/middleman") ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}>
                  <ShieldCheck className="h-4 w-4" /> Middleman Panel
                </Link>
              )}
              {user && profile?.role === "admin" && (
                <Link to="/admin" onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive("/admin") ? "bg-red-500/10 text-red-400" : "text-red-400 hover:bg-white/5 hover:text-red-300"
                  }`}>
                  <Settings className="h-4 w-4" /> Admin Panel
                </Link>
              )}
              {user ? (
                <button onClick={() => { signOut(); setMobileOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              ) : (
                <button onClick={() => { navigate("/login"); setMobileOpen(false); }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark">
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <Outlet />
    </div>
  );
}
