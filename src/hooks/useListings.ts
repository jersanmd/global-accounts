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
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: async (): Promise<ListingWithSeller | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("listings")
        .select("*, seller:profiles!listings_seller_id_fkey(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as ListingWithSeller;
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
}
