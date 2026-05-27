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
          "*, listing:listings(*, seller:profiles!listings_seller_id_fkey(*)), buyer:profiles!transactions_buyer_id_fkey(*), middleman:profiles!transactions_middleman_id_fkey(*)"
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as TransactionFull;
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

      const { data, error } = await supabase
        .from("transactions")
        .select(
          "*, listing:listings(*, seller:profiles!listings_seller_id_fkey(*)), buyer:profiles!transactions_buyer_id_fkey(*), middleman:profiles!transactions_middleman_id_fkey(*)"
        )
        .eq("buyer_id", user.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as TransactionFull[]) ?? [];
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
        .in("status", ["mm_assigned", "channel_created", "demo_completed", "transfer_witnessed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as TransactionFull[]) ?? [];
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
