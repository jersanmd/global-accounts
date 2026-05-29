import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Wallet, WithdrawableEntry, WithdrawnBatch } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function useWallet(userId: string | undefined) {
  const queryClient = useQueryClient();

  const wallet = useQuery({
    queryKey: ["wallet", userId],
    queryFn: async (): Promise<Wallet | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return (data as Wallet) ?? null;
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const withdrawable = useQuery({
    queryKey: ["withdrawable", userId],
    queryFn: async (): Promise<WithdrawableEntry[]> => {
      if (!userId) return [];
      const { data, error } = await (supabase as Any)
        .rpc("get_withdrawable_entries", { p_user_id: userId });
      if (error) throw error;
      return (data as WithdrawableEntry[]) ?? [];
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const withdrawn = useQuery({
    queryKey: ["withdrawn", userId],
    queryFn: async (): Promise<WithdrawnBatch[]> => {
      if (!userId) return [];
      const { data, error } = await (supabase as Any)
        .rpc("get_withdrawal_history", { p_user_id: userId });
      if (error) throw error;
      return (data as WithdrawnBatch[]) ?? [];
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const withdraw = useMutation({
    mutationFn: async ({ ledgerIds, method }: { ledgerIds: string[]; method: string }) => {
      const { data, error } = await (supabase as Any)
        .rpc("wallet_mark_withdrawn", {
          p_user_id: userId,
          p_ledger_ids: ledgerIds,
          p_method: method,
        });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", userId] });
      queryClient.invalidateQueries({ queryKey: ["withdrawable", userId] });
      queryClient.invalidateQueries({ queryKey: ["withdrawn", userId] });
    },
  });

  return {
    balance: wallet.data?.balance_available ?? 0,
    isLoading: wallet.isLoading,
    withdrawable: withdrawable.data ?? [],
    withdrawn: withdrawn.data ?? [],
    withdraw,
  };
}
