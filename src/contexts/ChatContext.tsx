import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface Conversation {
  id: string;
  type: "direct" | "group";
  title: string | null;
  transaction_id: string | null;
  created_at: string;
  participants?: { user_id: string; profile?: { email: string; discord_username: string } }[];
  last_message?: { content: string; sender_id: string; created_at: string };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConvId: string | null;
  messages: Record<string, Message[]>;
  unread: Record<string, number>;
  openChat: (convId: string) => void;
  closeChat: (convId: string) => void;
  minimizeChat: (convId: string) => void;
  sendMessage: (convId: string, content: string) => Promise<void>;
  startDM: (otherUserId: string) => Promise<string>;
  createGroup: (txId: string) => Promise<string>;
  openConvs: string[];
  minimized: string[];
  closed: string[];
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [openConvs, setOpenConvs] = useState<string[]>([]);
  const [minimized, setMinimized] = useState<string[]>([]);
  const [closed, setClosed] = useState<string[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchedRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data: parts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .eq("user_id", user.id);
    if (!parts || parts.length === 0) return;

    const convIds = [...new Set(parts.map((p: any) => p.conversation_id))];
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds);
    if (!convs) return;

    const convMap = new Map<string, Conversation>();
    for (const c of convs) {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", c.id);
      const pList = participants ?? [];
      const userIds = pList.map((p: any) => p.user_id);
      const { data: profiles } = userIds.length > 0 ? await supabase.from("profiles").select("id, email, discord_username, avatar_url, role").in("id", userIds) : { data: [] };
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, sender_id, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      convMap.set(c.id, {
        ...c,
        participants: pList.map((p: any) => ({ user_id: p.user_id, profile: profileMap.get(p.user_id) })),
        last_message: lastMsg ?? undefined,
      });
    }
    setConversations(Array.from(convMap.values()).sort((a, b) =>
      new Date(b.last_message?.created_at || b.created_at).getTime() -
      new Date(a.last_message?.created_at || a.created_at).getTime()
    ));
  }, [user]);

  const fetchMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(prev => ({ ...prev, [convId]: data }));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!fetchedRef.current) { fetchConversations(); fetchedRef.current = true; }
    const ch = supabase
      .channel("chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => {
          const existing = prev[msg.conversation_id] ?? [];
          return { ...prev, [msg.conversation_id]: [...existing, msg] };
        });
        setOpenConvs(prev => { if (prev.includes(msg.conversation_id)) return prev; setUnread(u => ({ ...u, [msg.conversation_id]: (u[msg.conversation_id] ?? 0) + 1 })); return prev; });
        fetchConversations();
      })
      .subscribe();
    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [user]);

  const openChat = useCallback((convId: string) => {
    setOpenConvs(prev => prev.includes(convId) ? prev : [...prev, convId]);
    setMinimized(prev => prev.filter(id => id !== convId));
    setClosed(prev => prev.filter(id => id !== convId));
    setUnread(prev => ({ ...prev, [convId]: 0 }));
    fetchMessages(convId);
  }, [fetchMessages]);

  const closeChat = useCallback((convId: string) => {
    setOpenConvs(prev => prev.filter(id => id !== convId));
    setMinimized(prev => prev.filter(id => id !== convId));
    setClosed(prev => prev.includes(convId) ? prev : [...prev, convId]);
  }, []);

  const minimizeChat = useCallback((convId: string) => {
    setMinimized(prev => prev.includes(convId) ? prev : [...prev, convId]);
  }, []);

  const sendMessage = useCallback(async (convId: string, content: string) => {
    if (!user || !content.trim()) return;
    await supabase.from("messages").insert({
      conversation_id: convId, sender_id: user.id, content: content.trim(),
    });
  }, [user]);

  const startDM = useCallback(async (otherUserId: string): Promise<string> => {
    if (!user) return "";
    const { data, error } = await supabase.rpc("get_or_create_dm", { user_a: user.id, user_b: otherUserId });
    if (error) throw error;
    await fetchConversations();
    return data;
  }, [user, fetchConversations]);

  const createGroup = useCallback(async (txId: string): Promise<string> => {
    const { data, error } = await supabase.rpc("create_transaction_group", { tx_id: txId });
    if (error) throw error;
    await fetchConversations();
    return data;
  }, [fetchConversations]);

  return (
    <ChatContext.Provider value={{ conversations, openConvs, minimized, closed, messages, unread, openChat, closeChat, minimizeChat, sendMessage, startDM, createGroup }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
