import { Link } from "react-router-dom";
import { Shield, Star, Clock, CheckCircle, Eye } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatUSD, timeAgo, getAvatarUrl } from "@/lib/utils";
import { RISK_LABELS, LISTING_TYPE_LABELS } from "@/lib/constants";
import { isUserOnline } from "@/hooks/useOnlineStatus";
import { useState } from "react";

interface Props {
  listing: Listing;
}

const GAME_GRADIENTS: Record<string, string> = {
  "Genshin Impact": "from-blue-600 via-cyan-500 to-teal-400",
  "Honkai: Star Rail": "from-indigo-600 via-purple-500 to-pink-400",
  "League of Legends": "from-yellow-600 via-amber-500 to-orange-400",
  Valorant: "from-red-600 via-rose-500 to-orange-400",
  Fortnite: "from-purple-600 via-violet-500 to-pink-400",
  "Apex Legends": "from-orange-600 via-red-500 to-rose-400",
  "Call of Duty": "from-green-700 via-emerald-500 to-lime-400",
  "Clash of Clans": "from-yellow-700 via-amber-500 to-yellow-400",
  PUBG: "from-gray-700 via-slate-500 to-gray-400",
  "World of Warcraft": "from-blue-700 via-sky-500 to-cyan-400",
};

const DEFAULT_GRADIENT = "from-gray-600 via-slate-500 to-gray-400";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

export function ListingCard({ listing }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const gradient = GAME_GRADIENTS[listing.game] ?? DEFAULT_GRADIENT;
  const hasScreenshot =
    listing.screenshots_urls && listing.screenshots_urls.length > 0;

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="premium-card group block overflow-hidden"
    >
      {/* Image banner */}
      <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {hasScreenshot ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 shimmer-skeleton" />}
            <img src={listing.screenshots_urls[0]} alt={listing.game} onLoad={() => setImgLoaded(true)}
              className={`h-full w-full object-cover transition-all duration-700 ${imgLoaded ? "opacity-90 group-hover:scale-110 group-hover:opacity-100" : "opacity-0"}`} />
          </>
        ) : (
          <span className="text-4xl font-black text-white/25 select-none tracking-wider">{listing.game}</span>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className={`badge-glass inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${RISK_COLORS[listing.risk_rating] ?? "bg-gray-100/80 text-gray-700 border-gray-200"}`}>
            <Shield className="h-2.5 w-2.5" />{RISK_LABELS[listing.risk_rating]}
          </span>
          <span className="badge-glass inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-white">
            <Clock className="h-2.5 w-2.5" />{timeAgo(listing.created_at)}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-500 group-hover:bg-black/40">
          <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-5 py-2 text-xs font-semibold text-gray-900 opacity-0 shadow-xl transition-all duration-500 group-hover:opacity-100 scale-90 group-hover:scale-100 dark:!bg-white dark:!text-gray-900">
            <Eye className="h-3.5 w-3.5" />View Details
          </span>
        </div>

        <span className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">{listing.platform}</span>
        {listing.listing_type && listing.listing_type !== "account" && (
          <span className="absolute bottom-3 right-3 rounded-lg bg-primary/80 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">Items</span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="mb-2">
          <h3 className="text-sm font-bold tracking-tight text-gray-900 transition-colors group-hover:text-primary">{listing.game}</h3>
          <p className="text-xs font-medium text-gray-400">{listing.rank}</p>
        </div>
        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-gray-500">{listing.inventory_summary}</p>

        {/* Seller + Price */}
        <div className="flex items-end justify-between border-t border-gray-100 pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Price</p>
            <p className="text-xl font-extrabold tracking-tight text-gray-900">{formatUSD(listing.price_usd)}</p>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div className="relative shrink-0">
              <img
                src={getAvatarUrl(listing.seller?.email, listing.seller?.avatar_url, 64)}
                alt=""
                className="h-7 w-7 rounded-full ring-2 ring-white"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${isUserOnline(listing.seller?.last_seen_at) ? "bg-green-500" : "bg-gray-300"}`} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-600 truncate max-w-[65px]">{(listing.seller?.discord_username || listing.seller?.email?.split("@")[0]) ?? "Seller"}</p>
              <div className="flex items-center justify-end gap-1">
                {listing.seller?.avg_rating ? (
                  <>
                    <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                    <span className="text-[11px] font-semibold text-gray-500">{listing.seller.avg_rating.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-gray-400">New</span>
                )}
                <CheckCircle className="h-3 w-3 text-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
