import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Transaction, Listing, Profile } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

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

      // Try direct query first
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "*, listing:listings!left(*, seller:profiles!listings_seller_id_fkey(*)), buyer:profiles!transactions_buyer_id_fkey(*), middleman:profiles!transactions_middleman_id_fkey(*)"
        )
        .eq("id", id)
        .single();

      if (!error && data) {
        const tx = data as unknown as TransactionFull;
        if (!tx.listing) {
          try {
            const rpcRes = await (supabase as Any).rpc("get_listing_for_participant", { p_listing_id: tx.listing_id });
            if (rpcRes.data) tx.listing = rpcRes.data as Any;
          } catch { /* RPC may not be deployed */ }
        }
        return tx;
      }

      // RLS blocked — try RPC fallback via seller transactions
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const rpcRes = await (supabase as Any).rpc("get_seller_txns", { p_seller_id: user.user.id });
          if (rpcRes.data) {
            const txns = rpcRes.data as Any[];
            const found = txns.find((t: Any) => t.id === id);
            if (found) {
              if (!found.listing) {
                try {
                  const listRes = await (supabase as Any).rpc("get_listing_for_participant", { p_listing_id: found.listing_id });
                  if (listRes.data) found.listing = listRes.data;
                } catch {
                  /* RPC may not be deployed */
                }
              }
              return found as TransactionFull;
            }
          }
        }
      } catch { /* RPC fallback failed */ }

      throw error || new Error("Transaction not found");
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useBuyerTransactions() {
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
              const rpcRes = await (supabase as Any).rpc("get_listing_for_participant", { p_listing_id: tx.listing_id });
              if (rpcRes.data) tx.listing = rpcRes.data as Any;
            } catch { /* RPC may not be deployed */ }
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
            const rpcRes = await (supabase as Any).rpc("get_listing_for_participant", { p_listing_id: tx.listing_id });
            if (rpcRes.data) tx.listing = rpcRes.data as Any;
          } catch { /* RPC may not be deployed */ }
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
      const { error } = await (supabase.from("transactions") as Any)
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
      quantity = 1,
    }: {
      listingId: string;
      amountUsd: number;
      quantity?: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await (supabase.from("transactions") as Any)
        .insert({
          listing_id: listingId,
          buyer_id: user.user.id,
          amount_usd: amountUsd,
          quantity,
          status: "paid",
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
