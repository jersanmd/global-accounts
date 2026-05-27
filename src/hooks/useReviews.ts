import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Review } from "@/lib/types";

type ReviewWithReviewer = Review & {
  reviewer: { email: string | null };
};

export function useReviews(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", sellerId],
    queryFn: async (): Promise<ReviewWithReviewer[]> => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey(email)")
        .eq("target_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as ReviewWithReviewer[]) ?? [];
    },
    enabled: !!sellerId,
    staleTime: 0,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      targetId,
      rating,
      comment,
    }: {
      transactionId: string;
      targetId: string;
      rating: number;
      comment: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          transaction_id: transactionId,
          reviewer_id: user.user.id,
          target_id: targetId,
          rating,
          comment: comment || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", variables.targetId] });
    },
  });
}
