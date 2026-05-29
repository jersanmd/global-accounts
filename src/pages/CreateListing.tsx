import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useGameCategories } from "@/hooks/useGameCategories";
import { useListing } from "@/hooks/useListings";
import { useQueryClient } from "@tanstack/react-query";
import type { ListingType } from "@/lib/types";
import {
  SUPPORTED_GAMES,
  SUPPORTED_PLATFORMS,
  MAX_SCREENSHOTS,
  MAX_SCREENSHOT_SIZE_MB,
  LISTING_TYPE_LABELS,
} from "@/lib/constants";
import { AlertTriangle } from "lucide-react";

export function CreateListing() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = !!editId;

  const { data: existingListing, isLoading: editLoading } = useListing(editId ?? undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmEdit, setConfirmEdit] = useState(false);

  const [form, setForm] = useState({
    game: "",
    platform: "",
    rank: "",
    price: "",
    inventory: "",
    riskRating: "medium" as "low" | "medium" | "high" | "critical",
    listingType: "account" as ListingType,
    stock: "",
    title: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [existingScreenshots, setExistingScreenshots] = useState<string[]>([]);
  const [customGame, setCustomGame] = useState("");
  const [sizeError, setSizeError] = useState("");

  const { data: dynamicGames } = useGameCategories();
  const allGames = [...new Set([...SUPPORTED_GAMES, ...(dynamicGames ?? [])])].sort();

  // Pre-fill form when editing an existing listing
  useEffect(() => {
    if (existingListing && isEditing) {
      const isKnown = allGames.includes(existingListing.game);
      setForm({
        game: isKnown ? existingListing.game : "__other__",
        platform: existingListing.platform,
        rank: existingListing.rank,
        price: String(existingListing.price_usd),
        inventory: existingListing.inventory_summary,
        riskRating: existingListing.risk_rating,
        listingType: existingListing.listing_type ?? "account",
        stock: existingListing.stock != null ? String(existingListing.stock) : "",
        title: existingListing.title || "",
      });
      if (!isKnown) setCustomGame(existingListing.game);
      setExistingScreenshots(existingListing.screenshots_urls ?? []);
    }
  }, [existingListing, isEditing]);

  // Reset confirmation when form changes
  useEffect(() => { setConfirmEdit(false); }, [form.game, form.platform, form.rank, form.price, form.inventory, form.riskRating, files.length]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const previewUrls = useMemo(
    () => files.map(f => URL.createObjectURL(f)),
    [files]
  );

  // Revoke URLs on cleanup
  useEffect(() => {
    return () => previewUrls.forEach(u => URL.revokeObjectURL(u));
  }, [previewUrls]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex(i => (i! - 1 + files.length) % files.length);
      if (e.key === "ArrowRight") setLightboxIndex(i => (i! + 1) % files.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, files.length]);

  const addFiles = useCallback((newFiles: File[]) => {
    setSizeError("");
    const maxBytes = MAX_SCREENSHOT_SIZE_MB * 1024 * 1024;
    const oversized = newFiles.filter(f => f.size > maxBytes);
    if (oversized.length > 0) {
      setSizeError(`${oversized.length} file(s) exceed ${MAX_SCREENSHOT_SIZE_MB}MB limit and were skipped.`);
    }
    const valid = newFiles.filter(f => f.size <= maxBytes);
    setFiles(prev => {
      const combined = [...prev, ...valid];
      return combined.slice(0, MAX_SCREENSHOTS);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
  };

  // Paste from clipboard
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type.split("/")[1] || "png";
            imageFiles.push(new File([blob], `clipboard-${Date.now()}.${ext}`, { type: item.type }));
          }
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [addFiles]);

  // Game search combobox
  const [gameOpen, setGameOpen] = useState(false);
  const [gameSearch, setGameSearch] = useState("");
  const gameDropdownRef = useRef<HTMLDivElement>(null);
  const selectedGame = form.game === "__other__" ? customGame : form.game;
  const filteredGames = allGames.filter(g =>
    g.toLowerCase().includes(gameSearch.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gameDropdownRef.current && !gameDropdownRef.current.contains(e.target as Node)) {
        setGameOpen(false);
        setGameSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectGame = (game: string) => {
    setForm({ ...form, game });
    setGameOpen(false);
    setGameSearch("");
    if (game !== "__other__") setCustomGame("");
  };

  useEffect(() => {
    const el = detailsRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [form.inventory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!selectedGame || (form.game === "__other__" && !customGame)) {
      setError("Please select or enter a game.");
      return;
    }

    // Minimum price validation
    const price = Number(form.price);
    const minPrice = form.listingType === "in_game_items" ? 5 : 10;
    const typeLabel = form.listingType === "in_game_items" ? "In-game items" : "Accounts";
    if (isNaN(price) || price < minPrice) {
      setError(`${typeLabel} require a minimum price of $${minPrice}.`);
      return;
    }

    // Require confirmation for edits
    if (isEditing && !confirmEdit) {
      setConfirmEdit(true);
      return;
    }
    setConfirmEdit(false);

    setError("");
    setLoading(true);
    const gameName = form.game === "__other__" ? customGame : form.game;

    try {
      // Upload new screenshots
      const urls: string[] = [];
      for (const file of files) {
        const path = `${profile.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-screenshots")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("listing-screenshots")
          .getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      const allScreenshots = [...existingScreenshots, ...urls];
      const rank = form.rank || (form.listingType === "in_game_items" ? "N/A" : "");
      const stock = form.listingType === "in_game_items" ? Math.max(1, Number(form.stock) || 1) : null;

      if (isEditing && editId) {
        // Update existing listing
        const { error: updateError } = await supabase.from("listings").update({
          game: gameName,
          platform: form.platform,
          rank,
          price_usd: Number(form.price),
          inventory_summary: form.inventory,
          risk_rating: form.riskRating,
          screenshots_urls: allScreenshots,
          listing_type: form.listingType,
          stock,
          title: form.title || null,
        }).eq("id", editId);
        if (updateError) throw updateError;
      } else {
        // Create new listing
        const { error: insertError } = await supabase.from("listings").insert({
          seller_id: profile.id,
          game: gameName,
          platform: form.platform,
          rank,
          price_usd: Number(form.price),
          inventory_summary: form.inventory,
          risk_rating: form.riskRating,
          screenshots_urls: allScreenshots,
          listing_type: form.listingType,
          status: "active",
          stock,
          title: form.title || null,
        });
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["game-categories"] });
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setLoading(false);
    }
  };

  if (editLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{isEditing ? "Edit Listing" : "Create Listing"}</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
        {/* I'm Selling — first, controls everything below */}
        <div>
          <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-500">I'm selling</label>
          {isEditing ? (
            <div className="rounded-xl border-2 border-primary bg-primary-light p-3 text-center text-primary shadow-sm">
              <span className="text-sm font-semibold">{LISTING_TYPE_LABELS[form.listingType]}</span>
              <span className="ml-1 text-[10px] opacity-70">{form.listingType === "account" ? "Full game account" : "Items, skins, currency"}</span>
              <p className="mt-1 text-[10px] text-gray-400">Type cannot be changed when editing</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            {(["account", "in_game_items"] as ListingType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, listingType: t, rank: t === "in_game_items" ? "N/A" : form.rank })}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                  form.listingType === t
                    ? "border-primary bg-primary-light text-primary shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <span className="text-sm font-semibold">{LISTING_TYPE_LABELS[t]}</span>
                <span className="text-[10px] opacity-70">{t === "account" ? "Full game account" : "Items, skins, currency"}</span>
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium">Listing Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder={`e.g. "AR 60 Whale Account — 20x 5★ Characters" or "10,000 V-Bucks — Instant Delivery"`}
            required
          />
          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">A catchy title helps your listing stand out</p>
        </div>

        {/* Game */}
        <div>
          <label className="mb-1 block text-sm font-medium">Game *</label>
          <div ref={gameDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => { setGameOpen(!gameOpen); setGameSearch(""); }}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                gameOpen ? "border-primary ring-2 ring-primary/15" : "border-gray-200 hover:border-gray-300"
              } ${!selectedGame ? "text-gray-400" : "text-gray-900"}`}
            >
              <span>{selectedGame || "Select game"}</span>
              <svg className={`h-4 w-4 text-gray-400 transition-transform ${gameOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {gameOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl">
                {/* Search input */}
                <div className="border-b border-gray-100 p-2">
                  <input
                    type="text"
                    value={gameSearch}
                    onChange={(e) => setGameSearch(e.target.value)}
                    placeholder="Search games…"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                    autoFocus
                  />
                </div>
                {/* Options */}
                <div className="max-h-56 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => selectGame("__other__")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    ➕ Other (type below)
                  </button>
                  {filteredGames.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => selectGame(g)}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                        form.game === g ? "bg-primary/5 font-semibold text-primary" : "text-gray-700"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                  {filteredGames.length === 0 && gameSearch && (
                    <p className="px-3 py-4 text-center text-xs text-gray-400">
                      No games found. Select "Other" to add a custom game.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {form.game === "__other__" && (
            <input
              type="text"
              value={customGame}
              onChange={(e) => setCustomGame(e.target.value)}
              placeholder="Enter game name…"
              className="mt-2 w-full rounded-lg border border-primary/30 bg-primary/[0.02] px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              required
            />
          )}
        </div>

        {/* Platform */}
        <div>
          <label className="mb-1 block text-sm font-medium">Platform *</label>
          <select
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            required
          >
            <option value="">Select platform</option>
            {SUPPORTED_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Rank — hidden for in-game items */}
        {form.listingType !== "in_game_items" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Rank / Level</label>
          <input
            type="text"
            value={form.rank}
            onChange={(e) => setForm({ ...form, rank: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="e.g. Diamond 2, AR 60"
            required
          />
        </div>
        )}

        {/* Price */}
        <div>
          <label className="mb-1 block text-sm font-medium">Price (USD) *</label>
          <input
            type="number"
            step="0.01"
            min={form.listingType === "in_game_items" ? 5 : 10}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${form.price && Number(form.price) < (form.listingType === "in_game_items" ? 5 : 10) ? "border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-500/5" : ""}`}
            required
          />
          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">Min ${form.listingType === "in_game_items" ? "5" : "10"} for {form.listingType === "in_game_items" ? "in-game items" : "accounts"}</p>
          {form.price && Number(form.price) < (form.listingType === "in_game_items" ? 5 : 10) && (
            <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
              ⚠️ Price must be at least ${form.listingType === "in_game_items" ? "5" : "10"} for {form.listingType === "in_game_items" ? "in-game items" : "accounts"}
            </p>
          )}
        </div>

        {/* Stock — only for in-game items */}
        {form.listingType === "in_game_items" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Available Stock *</label>
          <input
            type="number"
            min="1"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="How many of this item are available?"
            required
          />
          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">Listing stays active until stock runs out</p>
        </div>
        )}

        {/* Listing Details */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            {form.listingType === "in_game_items" ? "Item Details" : "Account Details"} *
          </label>
          <p className="mb-2 text-xs text-gray-400">
            {form.listingType === "in_game_items"
              ? "Describe the items you're selling — include quantities, stats, and any special attributes."
              : "Include everything a buyer needs to know — the more detail, the faster you'll sell."}
          </p>
          <textarea
            ref={detailsRef}
            value={form.inventory}
            onChange={(e) => setForm({ ...form, inventory: e.target.value })}
            rows={5}
            className="w-full resize-none overflow-hidden rounded-lg border px-3 py-2 text-sm"
            placeholder={form.listingType === "in_game_items"
              ? `Describe your items in detail:\n• Item names and quantities\n• Stats, rarity, or enchantments\n• Server / region\n• Any usage restrictions or requirements`
              : `Describe your account in detail:\n• Characters / champions unlocked (list the rare ones)\n• Skins, or cosmetic items (count + highlight valuable ones)\n• Rank / competitive tier (current + peak)\n• In-game currency balance (primogems, VP, Riot Points, etc.)\n• Battle pass / subscription status\n• Account age & region / server\n• Any linked accounts (Steam, Google, Facebook, etc.)\n• Notable achievements, limited items, or rare collectibles
(IGNs and personal info will be hidden from the listing)`}
            required
          />
        </div>

        {/* Risk Rating */}
        <div>
          <label className="mb-1 block text-sm font-medium">Risk Rating</label>
          <select
            value={form.riskRating}
            onChange={(e) =>
              setForm({
                ...form,
                riskRating: e.target.value as "low" | "medium" | "high" | "critical",
              })
            }
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="low">Low — Original email + receipt included</option>
            <option value="medium">Medium — Original email included, no receipt</option>
            <option value="high">High — No original email</option>
            <option value="critical">Critical — Linked accounts, no recovery info</option>
          </select>
        </div>

        {/* Screenshots */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Screenshots (max {MAX_SCREENSHOTS} · {MAX_SCREENSHOT_SIZE_MB}MB each)
          </label>
          <p className="mb-2 text-xs text-gray-400">
            Upload or paste (Ctrl+V) screenshots. First image is your cover. Click any image to preview full-screen.
          </p>
          {/* Existing screenshots (edit mode) */}
          {existingScreenshots.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Existing ({existingScreenshots.length})
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {existingScreenshots.map((url, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setExistingScreenshots(prev => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-500 transition-all hover:border-primary/40 hover:bg-primary/[0.02]">
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold shadow-sm">Browse</span>
            <span className="text-xs">or drag & drop / paste from clipboard</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          {sizeError && (
            <p className="mt-1 text-xs text-amber-600">{sizeError}</p>
          )}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-gray-600">
                {files.length} of {MAX_SCREENSHOTS} · Click to preview
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {files.map((f, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={previewUrls[i]}
                      alt={f.name}
                      className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                      onClick={() => setLightboxIndex(i)}
                    />
                    {/* Cover badge on first */}
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                        Cover
                      </span>
                    )}
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                    >
                      ×
                    </button>
                    {/* Filename */}
                    <span className="absolute bottom-1 left-1 max-w-[calc(100%-8px)] truncate rounded bg-black/50 px-1 py-0.5 text-[8px] text-white/80">
                      {f.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Counter */}
            <span className="absolute left-4 top-4 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
              {lightboxIndex + 1} / {files.length}
            </span>

            {/* Prev */}
            {files.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + files.length) % files.length); }}
                className="absolute left-4 rounded-xl bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next */}
            {files.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % files.length); }}
                className="absolute right-4 rounded-xl bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Image */}
            <img
              src={previewUrls[lightboxIndex]}
              alt={files[lightboxIndex]?.name ?? ""}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-lg py-3 font-medium text-white transition-all disabled:opacity-50 ${
            confirmEdit
              ? "bg-amber-500 hover:bg-amber-600 animate-pulse"
              : "bg-primary hover:bg-primary-dark"
          }`}
        >
          {loading ? (isEditing ? "Saving..." : "Creating...") : confirmEdit ? "⚠️ Click again to confirm changes" : isEditing ? "Save Changes" : "Create Listing"}
        </button>
      </form>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-gray-900">Creating Your Listing</p>
              <p className="mt-1 text-sm text-gray-500">
                {files.length > 0 ? `Uploading ${files.length} screenshot${files.length > 1 ? "s" : ""}…` : "Please wait while we set up your listing…"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
