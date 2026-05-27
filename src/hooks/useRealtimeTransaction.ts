import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Transaction } from "@/lib/types";

/**
 * Subscribe to Supabase Realtime changes on a specific transaction.
 * Invalidates the TanStack Query cache on any change.
 */
export function useRealtimeTransaction(transactionId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!transactionId) return;

    const channel = supabase
      .channel(`transaction-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${transactionId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          // Update the query cache optimistically
          queryClient.setQueryData(
            ["transaction", transactionId],
            (old: Transaction | undefined) => {
              if (!old) return old;
              return { ...old, ...(payload.new as Partial<Transaction>) };
            }
          );
          // Also invalidate list queries
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, queryClient]);
}
