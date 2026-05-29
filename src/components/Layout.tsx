import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getAvatarUrl } from "@/lib/utils";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { Shield, ShoppingCart, LogOut, Menu, X, LayoutDashboard, Banknote, ShieldCheck, Settings, Search, Bell, Check, Sun, Moon } from "lucide-react";
import { useSearchContext } from "@/contexts/SearchContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useRef, useEffect } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { formatUSD, timeAgo } from "@/lib/utils";

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { theme, toggle } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useOnlineStatus();

  const { search, setSearch, heroVisible, setHeroVisible } = useSearchContext();
  const isActive = (path: string) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  const dashboardPath = profile?.role === "admin" ? "/admin" : profile?.role === "middleman" ? "/middleman" : "/dashboard";

  return (
    <div className="min-h-screen bg-white dark:bg-dark">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-dark/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 transition-colors group-hover:bg-primary/25">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Raid<span className="text-primary">Store</span>
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
                  placeholder="Search accounts & items..."
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
                  {/* Notification Bell */}
                  <div ref={notifRef} className="relative">
                    <button
                      onClick={() => setNotifOpen(!notifOpen)}
                      className="relative rounded-lg p-2 text-gray-400 hover:bg-white/8 hover:text-white transition-all"
                    >
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white ring-2 ring-dark">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Dropdown */}
                    {notifOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-dark-light">
                        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Notifications</p>
                          {unreadCount > 0 && (
                            <button onClick={() => markAllRead.mutate()} className="text-xs font-medium text-primary hover:underline">
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <Bell className="mx-auto h-6 w-6 text-gray-300 dark:text-gray-600" />
                              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">No notifications yet</p>
                            </div>
                          ) : (
                            notifications.slice(0, 15).map(n => (
                              <button
                                key={n.id}
                                onClick={() => { markRead.mutate(n.id); if (n.link) window.location.href = n.link; }}
                                className={`flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5 ${
                                  !n.read ? "bg-primary/[0.02] dark:bg-primary/5" : ""
                                }`}
                              >
                                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                                <div className={!n.read ? "" : "ml-4"}>
                                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{n.title}</p>
                                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 dark:text-gray-400">{n.message}</p>
                                  <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(n.created_at)}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    to={dashboardPath}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      isActive(dashboardPath)
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
                <Link to={dashboardPath} className="rounded-lg p-2 text-gray-400 hover:bg-white/8 hover:text-white transition-all md:hidden">
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

            {/* Theme toggle — always visible */}
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/8 hover:text-white transition-all"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

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

      <ChatPanel />

      {/* Footer — hidden on browse page */}
      {location.pathname !== "/" && (
      <footer className="border-t border-gray-100 bg-white dark:border-white/[0.06] dark:bg-dark">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-extrabold text-gray-900 dark:text-white">RaidStore</span>
              </Link>
              <p className="mt-3 text-xs text-gray-500 leading-relaxed dark:text-gray-400">
                Buy and sell game accounts safely with middleman verification and escrow protection.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Platform</p>
              <div className="space-y-2">
                <Link to="/" className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Browse Listings</Link>
                <Link to="/terms" className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">How It Works</Link>
                <Link to="/profile" className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Verify Identity</Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Support</p>
              <div className="space-y-2">
                <a href="mailto:support@raidstore.gg" className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">support@raidstore.gg</a>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-6 dark:border-white/[0.06] sm:flex-row">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              &copy; {new Date().getFullYear()} RaidStore. All rights reserved.
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Secured by <span className="font-semibold text-gray-500 dark:text-gray-400">middleman escrow</span>
            </p>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
