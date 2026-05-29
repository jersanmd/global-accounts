import { useState, useRef, useEffect } from "react";
import { X, Send, Minus, MessageCircle, Loader2, ArrowLeft } from "lucide-react";
import { useChat, type Conversation } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl, timeAgo } from "@/lib/utils";

const PANEL = "w-[360px] h-[480px]";
const SHADOW = "shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]";
const ROLE_LABELS: Record<string, string> = { admin: "ADMIN", middleman: "MIDDLEMAN", seller: "SELLER", buyer: "BUYER" };
const ROLE_COLORS: Record<string, string> = { admin: "bg-red-500", middleman: "bg-indigo-500", seller: "bg-emerald-500", buyer: "bg-blue-500" };

function RoleBadge({ profile }: { profile?: any }) {
  if (!profile?.role || profile.role === "buyer") return null;
  const label = ROLE_LABELS[profile.role] || profile.role.toUpperCase();
  const color = ROLE_COLORS[profile.role] || "bg-gray-500";
  return <span className={`inline-flex shrink-0 items-center rounded-md ${color} px-1.5 py-0.5 text-[9px] font-bold text-white`}>{label}</span>;
}

function ChatPopup({ convId, onBack }: { convId: string; onBack: () => void }) {
  const { conversations, messages, closeChat, minimizeChat, sendMessage, minimized } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conv = conversations.find(c => c.id === convId);
  const msgs = messages[convId] ?? [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const other = (conv?.participants ?? []).find(p => p.user_id !== user?.id);
  const av = (p?: any) => getAvatarUrl(p?.profile?.email ?? null, p?.profile?.avatar_url ?? null, 48);
  const pName = (p?: any) => p?.profile?.discord_username || p?.profile?.email?.split("@")[0] || "User";
  const headerText = conv?.title || pName(other);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    await sendMessage(convId, input);
    setInput("");
    setSending(false);
  };

  if (minimized.includes(convId)) return null;

  return (
    <div className={`${PANEL} flex flex-col rounded-t-2xl bg-white dark:bg-gray-900 ${SHADOW} border border-gray-200/60 dark:border-white/[0.06] animate-slide-up`}>
      <div className="flex shrink-0 cursor-pointer items-center gap-2 rounded-t-2xl bg-gradient-to-r from-primary to-primary-dark px-3 py-3 text-white">
        <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="rounded-lg p-1 text-white/70 hover:bg-white/15 hover:text-white transition-colors"><ArrowLeft className="h-4 w-4" /></button>
        <img src={av(other)} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20" onClick={() => minimizeChat(convId)} />
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => minimizeChat(convId)}>
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold">{headerText}</span>
            <RoleBadge profile={other?.profile} />
          </div>
          <p className="text-[10px] text-white/70">{conv?.type === "group" ? `${(conv.participants ?? []).length} participants` : "Direct Message"}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); minimizeChat(convId); }} className="rounded-lg p-1.5 text-white/70 hover:bg-white/15 hover:text-white transition-colors"><Minus className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); closeChat(convId); }} className="rounded-lg p-1.5 text-white/70 hover:bg-white/15 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white px-4 py-4 space-y-4 dark:from-white/[0.02] dark:to-gray-900">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-8 w-8 text-gray-200 dark:text-white/5 mb-2" />
            <p className="text-xs text-gray-400">No messages yet</p>
          </div>
        )}
        {msgs.map(m => {
          const isMe = m.sender_id === user?.id;
          const sender = isMe ? null : (conv?.participants ?? []).find(p => p.user_id === m.sender_id);
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} animate-fade-in`}>
              {!isMe && <img src={av(sender)} alt="" className="mt-1 h-7 w-7 shrink-0 rounded-full object-cover" />}
              <div className="min-w-0 max-w-[75%]">
                {!isMe && conv?.type === "group" && (
                  <div className="mb-0.5 flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-gray-400">{pName(sender)}</span>
                    <RoleBadge profile={sender?.profile} />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-snug ${
                  isMe ? "rounded-br-md bg-gradient-to-br from-primary to-primary-dark text-white shadow-sm shadow-primary/20" : "rounded-bl-md bg-white text-gray-800 shadow-sm dark:bg-white/10 dark:text-white"
                }`}>{m.content}</div>
                <p className={`mt-0.5 text-[10px] text-gray-400 ${isMe ? "text-right" : "text-left"}`}>{timeAgo(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 flex items-center gap-2 border-t border-gray-100 bg-white px-4 py-3 dark:border-white/[0.06] dark:bg-gray-900">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          placeholder="Type a message..." className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500" />
        <button onClick={handleSend} disabled={!input.trim() || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 disabled:opacity-40 disabled:hover:shadow-none">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { conversations, openConvs, openChat, unread, minimized, closed, minimizeChat } = useChat();
  const { user } = useAuth();
  const [dockOpen, setDockOpen] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => { if (openConvs.length > 0) setDockOpen(true); else setDockOpen(false); }, [openConvs]);

  const visiblePopups = openConvs.filter(id => !minimized.includes(id));
  const dockedConvs = conversations.filter(c => !openConvs.includes(c.id) && !closed.includes(c.id));
  const minimizedOpen = minimized.filter(id => openConvs.includes(id));
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  const avatar = (c: Conversation) => {
    const other = (c.participants ?? []).find(p => p.user_id !== user?.id);
    return getAvatarUrl(other?.profile?.email ?? null, other?.profile?.avatar_url ?? null, 32);
  };
  const displayName = (c: Conversation) => {
    if (c.title) return c.title;
    const other = (c.participants ?? []).find(p => p.user_id !== user?.id);
    return other?.profile?.discord_username || other?.profile?.email?.split("@")[0] || "Chat";
  };
  const otherProfile = (c: Conversation) => (c.participants ?? []).find(p => p.user_id !== user?.id)?.profile;

  const toggleBubble = () => {
    if (showList) { setShowList(false); return; }
    if (dockOpen) { setDockOpen(false); return; }
    if (openConvs.length > 0) { setDockOpen(true); }
    else { setShowList(true); }
  };

  return (
    <>
      {showList && (
        <div className={`${PANEL} fixed bottom-20 right-5 z-50 flex flex-col rounded-2xl bg-white dark:bg-gray-900 ${SHADOW} border border-gray-200/60 dark:border-white/[0.06] animate-slide-up`}>
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chats</h3>
            <button onClick={() => setShowList(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-white/5 dark:hover:text-gray-300"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const listConvs = conversations.filter(c => !dockedConvs.includes(c.id));
              if (conversations.length === 0) return (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="mb-4 rounded-2xl bg-gray-100 p-4 dark:bg-white/5"><MessageCircle className="h-8 w-8 text-gray-300 dark:text-white/10" /></div>
                  <p className="text-sm font-semibold text-gray-400">No conversations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Message a seller to start chatting</p>
                </div>
              );
              if (listConvs.length === 0) return (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="mb-4 rounded-2xl bg-gray-100 p-4 dark:bg-white/5"><MessageCircle className="h-8 w-8 text-gray-300 dark:text-white/10" /></div>
                  <p className="text-sm font-semibold text-gray-400">All chats are open</p>
                  <p className="text-xs text-gray-400 mt-1">Check the dock below</p>
                </div>
              );
              return listConvs.map(c => (
                <button key={c.id} onClick={() => { openChat(c.id); setShowList(false); }}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                  <div className="relative shrink-0">
                    <img src={avatar(c)} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-gray-100 dark:ring-white/10" />
                    {unread[c.id] > 0 && <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">{unread[c.id]}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(c)}</p>
                      <RoleBadge profile={otherProfile(c)} />
                    </div>
                    {c.last_message && <p className="mt-0.5 truncate text-xs text-gray-400">{c.last_message.content}</p>}
                  </div>
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      {dockOpen && visiblePopups.map(id => (
        <div key={id} className="fixed bottom-20 z-50 animate-slide-up" style={{ right: `${20 + visiblePopups.indexOf(id) * 370}px` }}>
          <ChatPopup convId={id} onBack={() => { minimizeChat(id); setShowList(true); }} />
        </div>
      ))}

      <div className="fixed bottom-0 right-0 z-50 flex items-end gap-1.5 px-4 pb-3">
        {dockOpen && (<>
          {dockedConvs.map(c => {
            const other = (c.participants ?? []).find(p => p.user_id !== user?.id);
            const dName = c.title || other?.profile?.discord_username || other?.profile?.email?.split("@")[0] || "Chat";
            const has = unread[c.id] > 0;
            return (
              <button key={c.id} onClick={() => openChat(c.id)}
                className={`flex items-center gap-2 rounded-t-xl px-3.5 py-2.5 text-xs font-medium shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-b-0 ${has ? "bg-primary text-white border-primary shadow-primary/20 hover:bg-primary-dark" : "bg-white text-gray-700 border-gray-200/60 shadow-gray-200/20 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-white/10"}`}>
                <img src={avatar(c)} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20" />
                <div className="flex items-center gap-1">
                  <RoleBadge profile={other?.profile} />
                  <span className="max-w-[80px] truncate">{dName}</span>
                </div>
                {has && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unread[c.id]}</span>}
              </button>
            );
          })}
          {minimizedOpen.map(id => {
            const c = conversations.find(x => x.id === id);
            const other = (c?.participants ?? []).find(p => p.user_id !== user?.id);
            const dName = c?.title || other?.profile?.discord_username || other?.profile?.email?.split("@")[0] || "Chat";
            const has = unread[id] > 0;
            return (
              <button key={id} onClick={() => openChat(id)}
                className={`flex items-center gap-2 rounded-t-xl px-3.5 py-2.5 text-xs font-medium shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-b-0 ${has ? "bg-primary text-white border-primary shadow-primary/20 hover:bg-primary-dark" : "bg-white text-gray-700 border-gray-200/60 shadow-gray-200/20 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-white/10"}`}>
                <img src={c ? avatar(c) : ""} alt="" className="h-7 w-7 rounded-full object-cover" />
                <div className="flex items-center gap-1">
                  <RoleBadge profile={other?.profile} />
                  <span className="max-w-[70px] truncate">{dName}</span>
                </div>
                {has && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unread[id]}</span>}
              </button>
            );
          })}
        </>)}
        <button onClick={toggleBubble}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-primary/30">
          <div className="relative">
            <MessageCircle className="h-5 w-5" />
            {totalUnread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">{totalUnread}</span>}
          </div>
        </button>
      </div>
    </>
  );
}
