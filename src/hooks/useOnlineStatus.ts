import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Updates the current user's last_seen_at every 30 seconds.
 * Used to show online/offline status on seller profiles.
 */
export function useOnlineStatus() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updateHeartbeat = async () => {
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
    };

    // Update immediately
    updateHeartbeat();

    // Then every 30 seconds
    const interval = setInterval(updateHeartbeat, 30_000);

    // Also update on window focus
    const onFocus = () => updateHeartbeat();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);
}

/**
 * Check if a user appears online (last_seen_at within the last 2 minutes).
 */
export function isUserOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  return diff < 2 * 60 * 1000; // 2 minutes
}
