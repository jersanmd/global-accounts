// ─── Database Types (mirrors Supabase schema) ───

export type UserRole = "buyer" | "seller" | "middleman" | "admin";
export type KycStatus = "not_verified" | "pending" | "approved" | "rejected";
export type ListingStatus = "active" | "sold" | "cancelled";
export type RiskRating = "low" | "medium" | "high" | "critical";

export type TransactionStatus =
  | "awaiting_payment"
  | "paid"
  | "mm_assigned"
  | "channel_created"
  | "demo_completed"
  | "transfer_witnessed"
  | "funds_released"
  | "completed"
  | "disputed";

export interface Profile {
  id: string;
  email: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  discord_id: string | null;
  discord_username: string | null;
  avg_rating: number | null;
  last_seen_at: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  game: string;
  platform: string;
  rank: string;
  price_usd: number;
  inventory_summary: string;
  risk_rating: RiskRating;
  status: ListingStatus;
  screenshots_urls: string[];
  created_at: string;
  // Joined fields
  seller?: Profile;
}

export interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  middleman_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_usd: number;
  status: TransactionStatus;
  discord_channel_id: string | null;
  demo_approved: boolean;
  transfer_witnessed: boolean;
  funds_released: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  listing?: Listing;
  buyer?: Profile;
  middleman?: Profile;
}

export interface Credential {
  transaction_id: string;
  encrypted_data: string;
  created_at: string;
}

export interface Payment {
  id: string;
  transaction_id: string;
  stripe_transfer_id: string | null;
  amount_usd: number;
  type: "payment" | "transfer" | "refund";
  status: "pending" | "succeeded" | "failed";
  created_at: string;
}

export interface Review {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  target_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
