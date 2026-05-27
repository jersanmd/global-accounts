// Supabase generated types — run `npx supabase gen types typescript` to regenerate
// Placeholder types are defined in src/lib/types.ts until DB is provisioned

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: "buyer" | "seller" | "middleman" | "admin";
          kyc_status: "pending" | "approved" | "rejected";
          discord_id: string | null;
          discord_username: string | null;
          avg_rating: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: "buyer" | "seller" | "middleman" | "admin";
          kyc_status?: "pending" | "approved" | "rejected";
          discord_id?: string | null;
          discord_username?: string | null;
        };
        Update: {
          email?: string | null;
          role?: "buyer" | "seller" | "middleman" | "admin";
          kyc_status?: "pending" | "approved" | "rejected";
          discord_id?: string | null;
          discord_username?: string | null;
          avg_rating?: number | null;
        };
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          game: string;
          platform: string;
          rank: string;
          price_usd: number;
          inventory_summary: string;
          risk_rating: "low" | "medium" | "high" | "critical";
          status: "active" | "sold" | "cancelled";
          screenshots_urls: string[];
          created_at: string;
        };
        Insert: {
          seller_id: string;
          game: string;
          platform: string;
          rank: string;
          price_usd: number;
          inventory_summary: string;
          risk_rating: "low" | "medium" | "high" | "critical";
          screenshots_urls?: string[];
        };
        Update: {
          game?: string;
          platform?: string;
          rank?: string;
          price_usd?: number;
          inventory_summary?: string;
          risk_rating?: "low" | "medium" | "high" | "critical";
          status?: "active" | "sold" | "cancelled";
          screenshots_urls?: string[];
        };
      };
      transactions: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          middleman_id: string | null;
          stripe_payment_intent_id: string | null;
          amount_usd: number;
          status: string;
          discord_channel_id: string | null;
          demo_approved: boolean;
          transfer_witnessed: boolean;
          funds_released: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          listing_id: string;
          buyer_id: string;
          amount_usd: number;
          status?: string;
        };
        Update: {
          middleman_id?: string | null;
          stripe_payment_intent_id?: string | null;
          status?: string;
          discord_channel_id?: string | null;
          demo_approved?: boolean;
          transfer_witnessed?: boolean;
          funds_released?: boolean;
          updated_at?: string;
        };
      };
    };
    Functions: Record<string, never>;
  };
}
