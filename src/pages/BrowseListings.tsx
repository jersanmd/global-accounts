import { useListings } from "@/hooks/useListings";
import { useGameCategories } from "@/hooks/useGameCategories";
import { usePlatforms } from "@/hooks/usePlatforms";
import { ListingCard } from "@/components/ListingCard";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Shield, ShieldCheck, Users, Headphones, TrendingUp, X, Monitor, Smartphone, Gamepad, Tv, Laptop } from "lucide-react";
import { RISK_LABELS } from "@/lib/constants";
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
      <section className="hero-noise relative overflow-hidden bg-dark px-4 pb-20 pt-16 md:pb-24 md:pt-20">
        {/* Subtle dot grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />

        {/* Floating particles */}
        <div className="hero-particle" /><div className="hero-particle" /><div className="hero-particle" />
        <div className="hero-particle" /><div className="hero-particle" /><div className="hero-particle" />

        <div className="relative mx-auto max-w-7xl text-center">
          <div className="animate-fade-in-up badge-glass mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium tracking-wide text-gray-300">Live Middleman Verification</span>
          </div>
          <h1 className="animate-fade-in-up delay-100 mb-5 text-5xl font-extrabold leading-[1.1] tracking-tight text-white md:text-7xl">
            Game Accounts, <span className="bg-gradient-to-r from-primary via-orange-400 to-yellow-300 bg-clip-text text-transparent">Traded Safe</span>
          </h1>
          <p className="animate-fade-in-up delay-150 mx-auto mb-12 max-w-xl text-base leading-relaxed text-gray-400 md:text-lg">
            Every transaction watched live by a middleman. Money held in escrow. Zero scams. Zero stress.
          </p>
          <div className="animate-fade-in-up delay-200 mb-12 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {STATS.map((s, i) => (
              <div key={s.label} className="glass-card flex items-center gap-3 px-5 py-3" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
                <div className="rounded-xl bg-primary/15 p-2.5"><s.icon className="h-5 w-5 text-primary" /></div>
                <div className="text-left"><p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{s.label}</p><p className="text-sm font-bold text-white">{s.value}</p></div>
              </div>
            ))}
          </div>
          <div ref={searchBarRef} className="animate-fade-in-up delay-300 mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-white/5 px-5 py-4 ring-1 ring-white/8 transition-all duration-300 focus-within:bg-white/8 focus-within:ring-primary/50 focus-within:shadow-[0_0_40px_rgba(244,117,33,0.12)]">
            <Search className="h-5 w-5 shrink-0 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by game, rank, or inventory..." className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none" />
            {search && (
              <button onClick={() => setSearch("")} className="shrink-0 rounded-full p-0.5 text-gray-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
            )}
          </div>
        </div>

        {/* Game categories — inside hero */}
        <div className="relative mx-auto mt-16 max-w-7xl">
          <div className="mx-auto flex w-3/4 flex-wrap items-center justify-center gap-2">
            {categories.map((cat, i) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`animate-fade-in-up shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  category === cat
                    ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105"
                    : "bg-white/8 text-gray-400 hover:bg-white/12 hover:text-white hover:scale-105"
                }`}
                style={{ animationDelay: `${0.4 + i * 0.04}s` }}>
                <span className="mr-1.5">{GAME_ICONS[cat] ?? "🎮"}</span>{cat === "All" ? "All Games" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar — inside hero */}
        <div className="relative mx-auto mt-4 max-w-7xl">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {dynamicPlatforms.map(p => {
              const info = PLATFORM_ICONS[p] ?? { icon: Monitor, label: p };
              return (
                <button key={p} onClick={() => setPlatform(platform === p ? "" : p)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    platform === p
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}>
                  <info.icon className="h-3.5 w-3.5" />{info.label}
                </button>
              );
            })}
            <span className="h-5 w-px bg-white/10" />
            <select value={riskFilter} onChange={e => setRiskFilter(e.target.value as RiskRating | "")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-white/20 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20">
              {RISK_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-dark text-gray-300">{o.label}</option>)}
            </select>
            <span className="hidden text-xs text-gray-500 sm:inline">Price:</span>
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
      <section className="bg-surface px-4 pt-6 pb-12">
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
          <div className="animate-pulse-glow mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-5 py-2 text-sm font-semibold tracking-wide text-primary"><Shield className="h-4 w-4" />GlobalAccount Protect</div>
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
      <footer className="border-t border-white/5 bg-dark px-4 py-12">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="text-lg font-bold tracking-tight text-white">Global<span className="text-primary">Account</span></span></div>
          <div className="mb-4 flex items-center justify-center gap-6 text-xs text-gray-500">
            <a href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</a>
            <a href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
          </div>
          <p className="text-xs text-gray-600">&copy; 2026 GlobalAccount. All game titles and trademarks are property of their respective owners.</p>
        </div>
      </footer>
    </div>
  );
}
