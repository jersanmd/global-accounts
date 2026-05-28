import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Transaction, Listing, Profile } from "@/lib/types";

type TransactionFull = Transaction & {
  listing: Listing & { seller: Profile };
  buyer: Profile;
  middleman: Profile | null;
};

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: async (): Promise<TransactionFull | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "*, listing:listings!left(*, seller:profiles!listings_seller_id_fkey(*)), buyer:profiles!transactions_buyer_id_fkey(*), middleman:profiles!transactions_middleman_id_fkey(*)"
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      const tx = data as unknown as TransactionFull;
      if (!tx.listing) {
        try {
          const { data: rpcListing } = await (supabase as any).rpc("get_listing_for_participant", { p_listing_id: tx.listing_id });
          if (rpcListing) tx.listing = rpcListing as any;
        } catch {}
      }
      return tx;
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useBuyerTransactions() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["transactions", "buyer"],
    queryFn: async (): Promise<TransactionFull[]> => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // First try direct query
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "*, listing:listings(*, seller:profiles!listings_seller_id_fkey(*)), buyer:profiles!transactions_buyer_id_fkey(*), middleman:profiles!transactions_middleman_id_fkey(*)"
        )
        .eq("buyer_id", user.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const txns = (data as unknown as TransactionFull[]) ?? [];

      // For any transaction where listing is null, try RPC fallback
      const missingIds = txns.filter(t => !t.listing).map(t => t.listing_id);
      if (missingIds.length > 0) {
        for (const tx of txns) {
          if (!tx.listing) {
            try {
              const { data: rpcListing } = await (supabase as any).rpc("get_listing_for_participant", { p_listing_id: tx.listing_id });
              if (rpcListing) tx.listing = rpcListing as any;
            } catch { /* RPC not deployed — keep null */ }
          }
        }
      }

      return txns;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useMiddlemanTransactions() {
  return useQuery({
    queryKey: ["transactions", "middleman"],
    queryFn: async (): Promise<TransactionFull[]> => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(
          "*, listing:listings(*, seller:profiles!listings_seller_id_fkey(*)), buyer:profiles!transactions_buyer_id_fkey(*), middleman:profiles!transactions_middleman_id_fkey(*)"
        )
        .eq("middleman_id", user.user.id)
        .in("status", ["paid", "mm_assigned", "channel_created", "demo_completed", "transfer_witnessed", "funds_released", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      const txns2 = (data as unknown as TransactionFull[]) ?? [];

      for (const tx of txns2) {
        if (!tx.listing) {
          try {
            const { data: rpcListing } = await (supabase as any).rpc("get_listing_for_participant", { p_listing_id: tx.listing_id });
            if (rpcListing) tx.listing = rpcListing as any;
          } catch {}
        }
      }

      return txns2;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 10_000,
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Transaction>;
    }) => {
      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["transaction", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      amountUsd,
    }: {
      listingId: string;
      amountUsd: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          listing_id: listingId,
          buyer_id: user.user.id,
          amount_usd: amountUsd,
          status: "awaiting_payment",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
