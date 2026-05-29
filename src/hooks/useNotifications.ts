import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as Notification[]) ?? [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from("notifications") as Any).update({ read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await (supabase.from("notifications") as Any).update({ read: true }).eq("user_id", user!.id).eq("read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  return {
    notifications: query.data ?? [],
    unreadCount: query.data?.filter(n => !n.read).length ?? 0,
    isLoading: query.isLoading,
    markRead,
    markAllRead,
  };
}

// Helper to create notifications (call from anywhere)
export async function createNotification(notification: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  await (supabase.from("notifications") as Any).insert({
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link ?? null,
  });
}
