import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BUYER_FEE_PERCENT, SELLER_FEE_PERCENT } from "./constants";

/** Merge Tailwind classes with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format USD amount */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/** Calculate buyer price (listing + buyer fee) */
export function calcBuyerPrice(listingPrice: number): number {
  const fee = listingPrice * (BUYER_FEE_PERCENT / 100);
  return Math.round((listingPrice + fee) * 100) / 100;
}

/** Calculate seller payout (listing - seller fee) */
export function calcSellerPayout(listingPrice: number): number {
  const fee = listingPrice * (SELLER_FEE_PERCENT / 100);
  return Math.round((listingPrice - fee) * 100) / 100;
}

/** Format date */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

/** Get relative time */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Get status progress index */
export function getStatusProgress(status: string, flow: string[]): number {
  const idx = flow.indexOf(status);
  return idx === -1 ? 0 : idx;
}

/** Get avatar URL - uses stored URL or falls back to generated avatar */
export function getAvatarUrl(email: string | null | undefined, storedUrl?: string | null, size = 80): string {
  if (storedUrl) return storedUrl;
  const name = email?.split("@")[0] ?? "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=f47521&color=fff&bold=true&format=svg`;
}

/** Get initials from email for fallback */
export function getInitials(email: string | null | undefined): string {
  if (!email) return "U";
  const parts = email.split("@")[0].replace(/[._-]/g, " ").split(" ");
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}
