import type { TransactionStatus, ListingStatus, RiskRating } from "./types";

// ─── Platform Fees ───
export const SELLER_FEE_PERCENT = 8;
export const BUYER_FEE_PERCENT = 3;

// ─── Transaction Status Flow ───
export const TRANSACTION_STATUS_FLOW: TransactionStatus[] = [
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
  paid: "Paid",
  mm_assigned: "Middleman Assigned",
  channel_created: "Group Chat Created",
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
  "Zenless Zone Zero",
  "Wuthering Waves",
  "League of Legends",
  "Valorant",
  "Counter-Strike 2",
  "Overwatch 2",
  "Rainbow Six Siege",
  "Fortnite",
  "Apex Legends",
  "Call of Duty",
  "Warzone",
  "PUBG",
  "Escape from Tarkov",
  "Destiny 2",
  "Roblox",
  "Minecraft",
  "Grand Theft Auto V",
  "Elden Ring",
  "Diablo IV",
  "World of Warcraft",
  "Final Fantasy XIV",
  "Lost Ark",
  "Path of Exile 2",
  "Throne and Liberty",
  "Black Desert Online",
  "Clash of Clans",
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

// ─── Crypto ───
export const PLATFORM_USDC_ADDRESS = import.meta.env.VITE_PLATFORM_USDC_ADDRESS || "0x541e5d5142c536f3ecbb166b2355c9a3c9141ead";
export const PLATFORM_BSC_ADDRESS = import.meta.env.VITE_PLATFORM_BSC_ADDRESS || "0x541e5d5142c536f3ecbb166b2355c9a3c9141ead";
export const PLATFORM_TRON_ADDRESS = import.meta.env.VITE_PLATFORM_TRON_ADDRESS || "TAC372pngAay91sm1YapNhf7nh9h1JdY3y";
export const PLATFORM_KLAYTN_ADDRESS = import.meta.env.VITE_PLATFORM_KLAYTN_ADDRESS || "0x541e5d5142c536f3ecbb166b2355c9a3c9141ead";
export const PLATFORM_SOL_ADDRESS = import.meta.env.VITE_PLATFORM_SOL_ADDRESS || "";
export const PLATFORM_ICP_ADDRESS = import.meta.env.VITE_PLATFORM_ICP_ADDRESS || "38f2b12a9831a41c61063cc8102cbc83f344f01d044258d58008153e285e7fcc";
export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || "";
