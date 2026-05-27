import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SUPPORTED_PLATFORMS } from "@/lib/constants";

export function usePlatforms() {
  return useQuery({
    queryKey: ["platforms"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("platform")
        .eq("status", "active");

      if (error) throw error;

      const platforms = [...new Set((data as { platform: string }[]).map((d) => d.platform))];
      // Merge with base platforms, dedupe, sort
      const merged = [...new Set([...SUPPORTED_PLATFORMS, ...platforms])].sort();
      return merged;
    },
    staleTime: 60_000,
  });
}
