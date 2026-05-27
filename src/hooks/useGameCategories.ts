import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useGameCategories() {
  return useQuery({
    queryKey: ["game-categories"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("game")
        .eq("status", "active");

      if (error) throw error;

      // Extract unique game names
      const games = [...new Set((data as { game: string }[]).map((d) => d.game))];
      return games.sort();
    },
    staleTime: 60_000,
  });
}
