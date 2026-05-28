import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Listing, Profile } from "@/lib/types";

interface UseListingsParams {
  game?: string;
  platform?: string;
  sellerId?: string;
}

type ListingWithSeller = Listing & { seller: Profile };

export function useListings(params?: UseListingsParams) {
  return useQuery({
    queryKey: ["listings", params],
    queryFn: async (): Promise<ListingWithSeller[]> => {
      let query = supabase
        .from("listings")
        .select("*, seller:profiles!listings_seller_id_fkey(*)")
        .eq("status", "active")
        .eq("disabled", false)
        .order("created_at", { ascending: false });

      if (params?.game) query = query.eq("game", params.game);
      if (params?.platform) query = query.eq("platform", params.platform);
      if (params?.sellerId) query = query.eq("seller_id", params.sellerId);

      const { data, error } = await query;
      if (error) throw error;
      return (data as ListingWithSeller[]) ?? [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30_000,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: async (): Promise<ListingWithSeller | null> => {
      if (!id) return null;
      // Try direct query first (works for active listings)
      const { data, error } = await supabase
        .from("listings")
        .select("*, seller:profiles!listings_seller_id_fkey(*)")
        .eq("id", id)
        .single();
      if (!error && data) return data as ListingWithSeller;
      // Fallback: use RPC for sold/disabled listings (participants only)
      const { data: rpcData, error: rpcErr } = await (supabase as any)
        .rpc("get_listing_for_participant", { p_listing_id: id });
      if (rpcErr || !rpcData) throw error || rpcErr;
      return rpcData as unknown as ListingWithSeller;
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
}
