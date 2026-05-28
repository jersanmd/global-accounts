import type { TransactionStatus, ListingStatus, RiskRating } from "./types";

// ─── Platform Fees ───
export const SELLER_FEE_PERCENT = 8;
export const BUYER_FEE_PERCENT = 3;

// ─── Transaction Status Flow ───
export const TRANSACTION_STATUS_FLOW: TransactionStatus[] = [
  "awaiting_payment",
  "paid",
  "mm_assigned",
  "channel_created",
  "demo_completed",
  "transfer_witnessed",
  "funds_released",
  "completed",
];

// ─── Status Labels ───
export const STATUS_LABELS: Record<TransactionStatus, string> = {
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  mm_assigned: "Middleman Assigned",
  channel_created: "Discord Channel Created",
  demo_completed: "Demo Completed",
  transfer_witnessed: "Transfer Witnessed",
  funds_released: "Funds Released",
  completed: "Completed",
  disputed: "Disputed",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  active: "Active",
  sold: "Sold",
  cancelled: "Cancelled",
};

export const RISK_LABELS: Record<RiskRating, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  account: "Account",
  in_game_items: "In-Game Items",
};

export const RISK_COLORS: Record<RiskRating, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

// ─── Games ───
export const SUPPORTED_GAMES = [
  "Genshin Impact",
  "Honkai: Star Rail",
  "League of Legends",
  "Valorant",
  "Fortnite",
  "Apex Legends",
  "Call of Duty",
  "Clash of Clans",
  "PUBG",
  "World of Warcraft",
] as const;

export const SUPPORTED_PLATFORMS = [
  "PC",
  "PlayStation",
  "Xbox",
  "Mobile",
] as const;

// ─── Supabase ───
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const STRIPE_PUBLISHABLE_KEY = import.meta.env
  .VITE_STRIPE_PUBLISHABLE_KEY as string;

// ─── Storage ───
export const SCREENSHOTS_BUCKET = "listing-screenshots";
export const MAX_SCREENSHOTS = 15;
export const MAX_SCREENSHOT_SIZE_MB = 5;

// ─── Contact & Links ───
export const SUPPORT_EMAIL = "support@raidstore.gg";
export const PRIVACY_EMAIL = "privacy@raidstore.com";
export const DISCORD_SERVER_URL = "https://discord.gg/raidstore";
export const DISCORD_BOT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/discord-bot/create-channel`;
