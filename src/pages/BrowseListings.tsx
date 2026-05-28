import { useListings } from "@/hooks/useListings";
import { useGameCategories } from "@/hooks/useGameCategories";
import { usePlatforms } from "@/hooks/usePlatforms";
import { ListingCard } from "@/components/ListingCard";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Shield, ShieldCheck, Users, Headphones, TrendingUp, X, Monitor, Smartphone, Gamepad, Tv, Laptop } from "lucide-react";
import { RISK_LABELS, SUPPORT_EMAIL, DISCORD_SERVER_URL } from "@/lib/constants";
import { useSearchContext } from "@/contexts/SearchContext";
import type { RiskRating } from "@/lib/types";

const GAME_ICONS: Record<string, string> = {
  "All": "🎮", "Genshin Impact": "🌌", "Honkai: Star Rail": "🚂", "League of Legends": "⚔️",
  "Valorant": "🎯", "Fortnite": "🏗️", "Apex Legends": "🦾", "Clash of Clans": "🏰", "World of Warcraft": "🐉",
};

const PLATFORM_ICONS: Record<string, { icon: typeof Monitor; label: string }> = {
  PC: { icon: Monitor, label: "PC" },
  PlayStation: { icon: Gamepad, label: "PS" },
  Xbox: { icon: Gamepad, label: "Xbox" },
  Mobile: { icon: Smartphone, label: "Mobile" },
  Switch: { icon: Gamepad, label: "Switch" },
  Steam: { icon: Monitor, label: "Steam" },
  Epic: { icon: Laptop, label: "Epic" },
  Browser: { icon: Tv, label: "Web" },
};

const RISK_OPTIONS: { value: RiskRating | ""; label: string }[] = [
  { value: "", label: "Any Risk" },
  { value: "low", label: "Low Risk" },
  { value: "medium", label: "Medium Risk" },
  { value: "high", label: "High Risk" },
  { value: "critical", label: "Critical" },
];

const STATS = [
  { icon: ShieldCheck, label: "Escrow Protected", value: "100%" },
  { icon: Users, label: "Live Middleman", value: "Verified" },
  { icon: Headphones, label: "24/7 Support", value: "Active" },
];

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

export function BrowseListings() {
  const [category, setCategory] = useState("All");
  const { search, setSearch, setHeroVisible } = useSearchContext();
  const [platform, setPlatform] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskRating | "">("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const trustRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const trustInView = useInView(trustRef);

  // Show nav search when hero search bar scrolls out of view
  useEffect(() => {
    const el = searchBarRef.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setHeroVisible(e.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [setHeroVisible]);
  const debouncedSearch = useDebounce(search, 300);

  const { data: listings, isLoading } = useListings({ game: category !== "All" ? category : undefined });
  const { data: dbGames } = useGameCategories();
  const { data: dynamicPlatforms = [] } = usePlatforms();

  // Build dynamic categories: "All" + unique games from DB
  const categories = ["All", ...(dbGames ?? [])];

  // Apply all client-side filters
  const filtered = useMemo(() => {
    if (!listings) return [];
    let result = [...listings];

    // Sort
    if (sortBy === "price-asc") result.sort((a, b) => a.price_usd - b.price_usd);
    else if (sortBy === "price-desc") result.sort((a, b) => b.price_usd - a.price_usd);
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Search (debounced)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(l =>
        l.game.toLowerCase().includes(q) ||
        l.inventory_summary.toLowerCase().includes(q) ||
        l.rank.toLowerCase().includes(q)
      );
    }

    // Platform
    if (platform) result = result.filter(l => l.platform === platform);

    // Risk
    if (riskFilter) result = result.filter(l => l.risk_rating === riskFilter);

    // Price range
    if (minPrice) result = result.filter(l => l.price_usd >= Number(minPrice));
    if (maxPrice) result = result.filter(l => l.price_usd <= Number(maxPrice));

    return result;
  }, [listings, sortBy, debouncedSearch, platform, riskFilter, minPrice, maxPrice]);

  // Active filter count (excluding search and category)
  const activeFilters = [platform, riskFilter, minPrice, maxPrice].filter(Boolean).length;

  const clearFilters = () => { setPlatform(""); setRiskFilter(""); setMinPrice(""); setMaxPrice(""); setSearch(""); };

  return (
    <div>
      {/* ═══════ HERO ═══════ */}
      <section className="hero-noise relative overflow-hidden bg-dark px-4 pb-16 pt-12 md:pb-20 md:pt-16">
        {/* Subtle dot grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />

        {/* Floating particles */}
        <div className="hero-particle" /><div className="hero-particle" /><div className="hero-particle" />
        <div className="hero-particle" /><div className="hero-particle" /><div className="hero-particle" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="animate-fade-in-up badge-glass mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium tracking-wide text-gray-300 dark:!text-gray-300">Live Middleman Verification</span>
          </div>
          <h1 className="animate-fade-in-up delay-100 mb-4 text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-6xl">
            Game Accounts <span className="text-gray-500">&</span> Items,<br className="sm:hidden" /> <span className="bg-gradient-to-r from-primary via-orange-400 to-yellow-300 bg-clip-text text-transparent">Traded Safe</span>
          </h1>
          <p className="animate-fade-in-up delay-150 mx-auto mb-8 max-w-md text-sm leading-relaxed text-gray-400 dark:!text-gray-400 sm:text-base">
            Every transaction verified live by a middleman. Money secured in escrow.
          </p>
          <div className="animate-fade-in-up delay-200 mb-8 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            {STATS.map((s, i) => (
              <div key={s.label} className="glass-card flex items-center gap-2.5 px-4 py-2.5" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
                <div className="rounded-lg bg-primary/15 p-2"><s.icon className="h-4 w-4 text-primary" /></div>
                <div className="text-left"><p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:!text-gray-500">{s.label}</p><p className="text-sm font-bold text-white">{s.value}</p></div>
              </div>
            ))}
          </div>
          <div ref={searchBarRef} className="animate-fade-in-up delay-300 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/8 transition-all duration-300 focus-within:bg-white/8 focus-within:ring-primary/50 focus-within:shadow-[0_0_40px_rgba(244,117,33,0.12)]">
            <Search className="h-4 w-4 shrink-0 text-gray-500 dark:!text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by game, rank, or inventory..." className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 dark:placeholder:!text-gray-500 focus:outline-none" />
            {search && (
              <button onClick={() => setSearch("")} className="shrink-0 rounded-full p-0.5 text-gray-500 dark:!text-gray-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            )}
          </div>
        </div>

        {/* Game categories — inside hero */}
        <div className="relative mx-auto mt-12 max-w-3xl">
          <div className="mx-auto flex flex-wrap items-center justify-center gap-1.5">
            {categories.map((cat, i) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`animate-fade-in-up shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  category === cat
                    ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105"
                    : "bg-white/8 text-gray-400 dark:!text-gray-400 hover:bg-white/12 hover:text-white hover:scale-105"
                }`}
                style={{ animationDelay: `${0.4 + i * 0.04}s` }}>
                <span className="mr-1.5">{GAME_ICONS[cat] ?? "🎮"}</span>{cat === "All" ? "All Games" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar — inside hero */}
        <div className="relative mx-auto mt-3 max-w-3xl">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {dynamicPlatforms.map(p => {
              const info = PLATFORM_ICONS[p] ?? { icon: Monitor, label: p };
              return (
                <button key={p} onClick={() => setPlatform(platform === p ? "" : p)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    platform === p
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-white/10 text-gray-400 dark:!text-gray-400 hover:border-white/20 hover:text-white"
                  }`}>
                  <info.icon className="h-3.5 w-3.5" />{info.label}
                </button>
              );
            })}
            <span className="h-5 w-px bg-white/10" />
            <select value={riskFilter} onChange={e => setRiskFilter(e.target.value as RiskRating | "")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 dark:!text-gray-400 hover:border-white/20 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20">
              {RISK_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-dark text-gray-300">{o.label}</option>)}
            </select>
            <span className="hidden text-xs text-gray-500 dark:!text-gray-500 sm:inline">Price:</span>
            <input type="number" placeholder="$ Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
              className="hidden w-20 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 placeholder:text-gray-600 focus:border-primary/50 focus:outline-none sm:inline" />
            <span className="hidden text-xs text-gray-600 sm:inline">–</span>
            <input type="number" placeholder="$ Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              className="hidden w-20 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 placeholder:text-gray-600 focus:border-primary/50 focus:outline-none sm:inline" />
            {activeFilters > 0 && (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
                  {activeFilters} filter{activeFilters !== 1 ? "s" : ""}
                </span>
                <button onClick={clearFilters} className="rounded-full p-1 text-gray-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ LISTINGS ═══════ */}
      <section className="bg-surface px-4 pt-6 pb-12 dark:bg-dark">
        <div className="mx-auto max-w-7xl">
          <div className="animate-fade-in-up mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{category === "All" ? "Browse All" : category}</h2>
              <p className="mt-1 text-sm text-gray-500">{filtered.length} account{filtered.length !== 1 ? "s" : ""} found</p>
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15">
              <option value="newest">🕐 Newest</option>
              <option value="price-asc">💰 Price: Low → High</option>
              <option value="price-desc">💎 Price: High → Low</option>
            </select>
          </div>

          {isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="shimmer-skeleton h-40" />
                  <div className="space-y-3 p-5">
                    <div className="shimmer-skeleton h-4 w-3/4 rounded-lg" /><div className="shimmer-skeleton h-3 w-1/2 rounded-lg" />
                    <div className="shimmer-skeleton h-3 w-full rounded-lg" /><div className="shimmer-skeleton h-3 w-5/6 rounded-lg" />
                    <div className="flex justify-between pt-3"><div className="shimmer-skeleton h-6 w-16 rounded-lg" /><div className="shimmer-skeleton h-4 w-12 rounded-lg" /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="animate-fade-in-up flex flex-col items-center py-24 text-center">
              <div className="mb-6 rounded-2xl bg-gray-100 p-6"><Search className="h-10 w-10 text-gray-300" /></div>
              <h3 className="mb-2 text-lg font-semibold text-gray-600">No accounts found</h3>
              <p className="max-w-sm text-sm text-gray-400">Try adjusting your search or filters</p>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors">Clear all filters</button>
              )}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((listing, i) => (
              <div key={listing.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TRUST ═══════ */}
      <section ref={trustRef} className="border-t border-border bg-white px-4 py-24">
        <div className={`mx-auto max-w-4xl text-center transition-all duration-800 ${trustInView ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
          <div className="animate-pulse-glow mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-5 py-2 text-sm font-semibold tracking-wide text-primary"><Shield className="h-4 w-4" />RaidStore Protect</div>
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">Trade With Confidence</h2>
          <p className="mx-auto mb-16 max-w-lg text-base leading-relaxed text-gray-500">Every transaction protected by our three-layer security system</p>
          <div className="grid gap-8 sm:grid-cols-3">
            {[{ icon: ShieldCheck, title: "Escrow Protection", desc: "Funds are held securely until you confirm the account is exactly as described." }, { icon: Users, title: "Live Middleman", desc: "A verified middleman witnesses the entire demo and transfer process in real time." }, { icon: TrendingUp, title: "Verified Sellers", desc: "Sellers are KYC-verified before receiving payouts. No anonymous scammers." }].map((item, i) => (
              <div key={item.title} className="trust-card premium-card p-8 text-center" style={{ transitionDelay: trustInView ? `${i * 0.12}s` : "0s", transform: trustInView ? "translateY(0) scale(1)" : "translateY(24px) scale(0.96)", opacity: trustInView ? 1 : 0 }}>
                <div className="mb-5 inline-flex rounded-2xl bg-primary-light p-4"><item.icon className="h-7 w-7 text-primary" /></div>
                <h3 className="mb-3 text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-gray-100 bg-white dark:border-white/[0.06] dark:bg-dark">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="grid gap-8 sm:grid-cols-3">
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
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Platform</p>
              <div className="space-y-2">
                <Link to="/" className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Browse Listings</Link>
                <Link to="/terms" className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">How It Works</Link>
                <Link to="/profile" className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Verify Identity</Link>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Support</p>
              <div className="space-y-2">
                <a href={DISCORD_SERVER_URL} target="_blank" rel="noopener noreferrer" className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Discord Server</a>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="block text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">{SUPPORT_EMAIL}</a>
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
    </div>
  );
}
