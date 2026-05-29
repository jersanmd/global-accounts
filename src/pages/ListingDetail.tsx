import { useParams, useNavigate, Link } from "react-router-dom";
import { useListing, useListings } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/hooks/useNotifications";
import { formatUSD, calcBuyerPrice, getAvatarUrl, timeAgo } from "@/lib/utils";
import { RISK_LABELS, RISK_COLORS, BUYER_FEE_PERCENT, LISTING_TYPE_LABELS } from "@/lib/constants";
import { Shield, Star, ShieldCheck, Calendar, MessageCircle, Award, ChevronLeft, ChevronRight, ShoppingCart, ImageIcon, Check, Clock, Tag, Info, Home, Maximize2, X } from "lucide-react";
import { isUserOnline } from "@/hooks/useOnlineStatus";
import { ListingCard } from "@/components/ListingCard";
import { StarRating } from "@/components/StarRating";
import { useReviews } from "@/hooks/useReviews";
import { useState } from "react";

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, error } = useListing(id);
  const { user, profile } = useAuth();
  const createTx = useCreateTransaction();
  const navigate = useNavigate();
  const [selectedImg, setSelectedImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // All hooks must be called before any early returns
  const { data: related } = useListings({ game: listing?.game });
  const { data: reviews } = useReviews(listing?.seller?.id);

  const handleRequestMiddleman = async () => {
    if (!listing || !user) return;
    setRequesting(true);
    try {
      const tx = await createTx.mutateAsync({ listingId: listing.id, amountUsd: calcBuyerPrice(listing.price_usd) * quantity, quantity });
      // Do NOT mark as sold yet — only disable when paid, mark sold when completed
      // Notify seller
      if (listing.seller_id) {
        createNotification({
          user_id: listing.seller_id,
          type: "new_sale",
          title: "New Purchase Request",
          message: `Someone wants to buy your ${listing.game} listing for ${formatUSD(calcBuyerPrice(listing.price_usd))}. Awaiting payment.`,
          link: `/transactions/${tx.id}`,
        });
      }
      navigate(`/transactions/${tx.id}`);
    } catch (err) { /* Transaction creation failed silently */ }
    finally { setRequesting(false); }
  };

  if (isLoading) return <div className="flex h-96 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" /></div>;
  if (error || !listing) return <div className="flex h-64 items-center justify-center text-gray-400">Listing not found.</div>;

  const screenshots = listing.screenshots_urls ?? [];
  const seller = listing.seller;
  const isOwnListing = user && profile && listing.seller_id === profile.id;
  const isSoldOrDisabled = listing.status !== "active" || listing.disabled;
  const isInGameItems = listing.listing_type === "in_game_items";
  const maxQty = listing.stock ?? 1;
  const buyerPrice = calcBuyerPrice(listing.price_usd) * quantity;
  const relatedListings = (related ?? []).filter(l => l.id !== listing.id).slice(0, 4);

  const nextImg = () => setSelectedImg(i => (i + 1) % screenshots.length);
  const prevImg = () => setSelectedImg(i => (i - 1 + screenshots.length) % screenshots.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-400">
        <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
          <Home className="h-3.5 w-3.5" />Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={`/?category=${encodeURIComponent(listing.game)}`} className="hover:text-primary transition-colors">
          {listing.game}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-600 truncate max-w-[200px]">{listing.rank}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-5">

        {/* ═══════ LEFT: Screenshots ═══════ */}
        <div className="lg:col-span-3">
          {screenshots.length > 0 ? (
            <div className="space-y-3">
              {/* Main image */}
              <div
                onClick={() => setLightboxOpen(true)}
                className="group relative cursor-zoom-in overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm">
                <img src={screenshots[selectedImg]} alt={`Screenshot ${selectedImg + 1}`}
                  className="h-[420px] w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                {/* Expand icon */}
                <div className="absolute top-3 right-3 rounded-lg bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <Maximize2 className="h-4 w-4" />
                </div>
                {screenshots.length > 1 && (
                  <>
                    <button onClick={prevImg}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/90 p-2 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-white">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={nextImg}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/90 p-2 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-white">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {selectedImg + 1} / {screenshots.length}
                    </div>
                  </>
                )}
              </div>
              {/* Thumbnails */}
              {screenshots.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {screenshots.map((url, i) => (
                    <button key={i} onClick={() => setSelectedImg(i)}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all hover:opacity-100 ${
                        i === selectedImg ? "border-primary shadow-md shadow-primary/20" : "border-transparent opacity-60 hover:border-gray-300"
                      }`}>
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-2xl border border-gray-100 bg-gray-50">
              <div className="text-center"><ImageIcon className="mx-auto h-16 w-16 text-gray-200" /><p className="mt-3 text-sm text-gray-400">No screenshots available</p></div>
            </div>
          )}

          {/* ═══════ DESCRIPTION ═══════ */}
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5"><Info className="h-4 w-4 text-primary" /></div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900">{listing.listing_type === "in_game_items" ? "Item Details" : "Account Details"}</h2>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                {listing.inventory_summary}
              </div>
              
              {/* Quick info badges */}
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                  <Tag className="h-3.5 w-3.5" />{listing.game}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                  🖥️ {listing.platform}
                </span>
                {listing.rank && listing.rank !== "N/A" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                  🏆 {listing.rank}
                </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                  <Clock className="h-3.5 w-3.5" />Listed {new Date(listing.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>

            {/* Related Listings — same game */}
            {relatedListings.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-1.5"><Tag className="h-4 w-4 text-primary" /></div>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900">More {listing.game} Accounts</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedListings.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ RIGHT: Sidebar ═══════ */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-5">

            {/* Game + Risk */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <span className={`badge-glass mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${RISK_COLORS[listing.risk_rating]}`}>
                <Shield className="h-3 w-3" />{RISK_LABELS[listing.risk_rating]} Risk
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{listing.title || listing.game}</h1>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {listing.game} · {listing.platform}
                {listing.rank && listing.rank !== "N/A" && <> · {listing.rank}</>}
              </p>
              
              {/* Price */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-500">Listing Price</span>
                  <span className="text-3xl font-extrabold tracking-tight text-gray-900">{formatUSD(listing.price_usd)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-sm">
                  <span className="text-gray-400">Buyer fee ({BUYER_FEE_PERCENT}%)</span>
                  <span className="text-gray-500">+{formatUSD(buyerPrice - listing.price_usd)}</span>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-extrabold text-primary">{formatUSD(buyerPrice)}</span>
                </div>
              </div>

              {/* Quantity selector for in-game items */}
              {isInGameItems && !isOwnListing && !isSoldOrDisabled && maxQty > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <label className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span>Quantity</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">{maxQty} available</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5">−</button>
                    <input type="number" min="1" max={maxQty} value={quantity}
                      onChange={e => setQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
                      className="h-9 w-16 rounded-lg border border-gray-200 text-center text-sm font-bold dark:border-white/10 dark:bg-dark-light dark:text-white" />
                    <button type="button" onClick={() => setQuantity(q => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5">+</button>
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="mt-5 space-y-2">
                {isSoldOrDisabled && !isOwnListing && (
                  <div className="rounded-xl bg-gray-50 p-3 text-center text-sm font-medium text-gray-500">
                    This listing is no longer available
                  </div>
                )}
                {isOwnListing ? (
                  <div className="rounded-xl bg-primary/5 p-4 text-center">
                    <p className="text-sm font-semibold text-primary">This is your listing</p>
                    <Link to={`/create-listing?edit=${listing.id}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                      Edit Listing →
                    </Link>
                  </div>
                ) : user && profile?.role !== "seller" && listing.status === "active" && !listing.disabled ? (
                  <button onClick={handleRequestMiddleman} disabled={requesting || listing.status !== "active"}
                    className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50">
                    <ShoppingCart className="h-4.5 w-4.5" />
                    {requesting ? "Creating..." : "Request Middleman"}
                  </button>
                ) : !user ? (
                  <button onClick={() => navigate("/login")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary py-3 text-sm font-semibold text-primary transition-all hover:bg-primary-light">
                    Sign In to Purchase
                  </button>
                ) : null}
                
                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 pt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-green-500" /> Escrow Protected</span>
                  <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-green-500" /> Verified Seller</span>
                </div>
              </div>
            </div>

            {/* Seller Card — hide when viewing own listing */}
            {!isOwnListing && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Seller</h3>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img src={getAvatarUrl(seller?.email, seller?.avatar_url, 80)} alt="" className="h-12 w-12 rounded-full ring-2 ring-white shadow-sm object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${isUserOnline(seller?.last_seen_at) ? "bg-green-500" : "bg-gray-300"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{seller?.email?.split("@")[0] ?? "Seller"}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {seller?.avg_rating ? (
                      <><Star className="h-3 w-3 fill-amber-400 stroke-amber-400" /><span className="text-xs font-semibold text-gray-600">{seller.avg_rating.toFixed(1)}</span></>
                    ) : <span className="text-xs text-gray-400">New</span>}
                    <span className="text-gray-300">·</span>
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isUserOnline(seller?.last_seen_at) ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isUserOnline(seller?.last_seen_at) ? "bg-green-500" : "bg-gray-400"}`} />
                      {isUserOnline(seller?.last_seen_at) ? "Online" : seller?.last_seen_at ? `Offline · ${timeAgo(seller.last_seen_at)}` : "Offline"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-3 text-xs text-gray-500">
                {seller?.discord_username && (
                  <div className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{seller.discord_username}</span></div>
                )}
                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 shrink-0" /><span>Member since {seller?.created_at ? new Date(seller.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}</span></div>
                <div className="flex items-center gap-2">
                  <Award className="h-3.5 w-3.5 shrink-0" />
                  <span>{seller?.kyc_status === "approved" ? "Identity verified" : "Identity pending"}</span>
                  {seller?.kyc_status === "approved" && <ShieldCheck className="h-3.5 w-3.5 text-green-500" />}
                </div>
              </div>
            </div>
            )}

            {/* Seller Reviews */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Reviews</h3>
                {seller?.avg_rating && (
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={seller.avg_rating} readonly size={12} />
                    <span className="text-xs font-bold text-gray-700">{seller.avg_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              {reviews && reviews.length > 0 ? (
                <div className="space-y-2.5">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="border-t border-gray-100 pt-2.5 first:border-0 first:pt-0">
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-600">{r.reviewer?.email?.split("@")[0] ?? "User"}</span>
                        <StarRating rating={r.rating} readonly size={10} />
                      </div>
                      {r.comment && <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-2">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No reviews yet.</p>
              )}
            </div>

            {/* Back link */}
            <Link to="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />Back to browse
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════ FULL-SCREEN LIGHTBOX ═══════ */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 rounded-xl bg-white/10 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            {selectedImg + 1} / {screenshots.length}
          </div>

          {/* Navigation */}
          {screenshots.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImg(); }}
                className="absolute left-4 z-10 rounded-xl bg-white/10 p-4 text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImg(); }}
                className="absolute right-4 z-10 rounded-xl bg-white/10 p-4 text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={screenshots[selectedImg]}
            alt={`Screenshot ${selectedImg + 1}`}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Thumbnails */}
          {screenshots.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {screenshots.map((url, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setSelectedImg(i); }}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    i === selectedImg ? "border-primary shadow-lg shadow-primary/30" : "border-white/20 opacity-50 hover:opacity-80"
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
