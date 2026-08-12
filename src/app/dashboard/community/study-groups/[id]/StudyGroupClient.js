"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Users, LogOut, MessageCircle } from "lucide-react";
import { sendMessage, updatePresence, removePresence, leaveStudyGroup, fetchRoomMessages, fetchRoomPresence } from "../../actions";

/* ── Subject colour system ─────────────────────────────────────────────── */
const C = {
  Biology:              { bg: "rgba(16,185,129,.12)",  text: "#34d399", accent: "#10b981" },
  Chemistry:            { bg: "rgba(245,158,11,.12)",  text: "#fbbf24", accent: "#f59e0b" },
  Physics:              { bg: "rgba(14,165,233,.12)",  text: "#38bdf8", accent: "#0ea5e9" },
  Mathematics:          { bg: "rgba(79,140,255,.12)",  text: "#7aa2ff", accent: "#4f8cff" },
  "Computer Science":   { bg: "rgba(168,85,247,.12)",  text: "#c084fc", accent: "#a855f7" },
  Economics:            { bg: "rgba(139,92,246,.12)",  text: "#a78bfa", accent: "#8b5cf6" },
  "Business Management":{ bg: "rgba(251,146,60,.12)",  text: "#fdba74", accent: "#fb923c" },
  History:              { bg: "rgba(168,85,247,.12)",  text: "#c084fc", accent: "#a855f7" },
  Geography:            { bg: "rgba(34,197,94,.12)",   text: "#4ade80", accent: "#22c55e" },
  English:              { bg: "rgba(236,72,153,.12)",  text: "#f472b6", accent: "#ec4899" },
  Languages:            { bg: "rgba(244,114,182,.12)", text: "#fbcfe8", accent: "#f472b6" },
  TOK:                  { bg: "rgba(244,63,94,.12)",   text: "#fb7185", accent: "#f43f5e" },
  "Extended Essay":     { bg: "rgba(251,191,36,.12)",  text: "#fcd34d", accent: "#fbbf24" },
  "General IB":         { bg: "rgba(148,163,184,.15)", text: "#cbd5e1", accent: "#94a3b8" },
};
const col = (s) => C[s] || { bg: "rgba(148,163,184,.12)", text: "#cbd5e1", accent: "#94a3b8" };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function StudyGroupClient({
  group, initialMessages, initialPresence,
  memberCount, userId, userProfile, isAdmin,
}) {
  const [presence, setPresence] = useState(initialPresence);
  const [isLeaving, startTransition] = useTransition();

  // 1. Poll for updated presence list (so the UI stays in sync)
  useEffect(() => {
    const pollPresence = async () => {
      try {
        const newPresence = await fetchRoomPresence(group.id);
        setPresence(newPresence);
      } catch {}
    };
    const interval = setInterval(pollPresence, 10000);
    return () => clearInterval(interval);
  }, [group.id]);

  // 2. Manage current user's presence (active on page)
  useEffect(() => {
    let interval;
    updatePresence(group.id).then(async () => {
      try {
        const newPresence = await fetchRoomPresence(group.id);
        setPresence(newPresence);
      } catch {}
    });

    interval = setInterval(() => {
      updatePresence(group.id);
    }, 30000);

    return () => {
      clearInterval(interval);
      removePresence(group.id);
    };
  }, [group.id]);

  const c = col(group.subject);

  const handleLeaveGroup = () => {
    if (confirm("Are you sure you want to leave this study group?")) {
      startTransition(async () => {
        await leaveStudyGroup(group.id);
        window.location.href = "/dashboard/community";
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-black relative">
      <div 
        className="absolute top-0 left-0 w-full h-[50vh] opacity-20 pointer-events-none blur-[100px] transition-colors duration-1000"
        style={{ background: `linear-gradient(135deg, ${c.bg} 0%, transparent 100%)` }}
      />
      
      {/* Header */}
      <header className="relative z-10 flex-none border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              href="/dashboard/community" 
              className="p-2 -ml-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span 
                  className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border"
                  style={{ color: c.text, background: c.bg, borderColor: c.accent + "30" }}
                >
                  {group.subject}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-medium text-white/40">
                  <Users size={12} /> {memberCount} Members
                </div>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                {group.name}
              </h1>
            </div>
          </div>

          <button 
            onClick={handleLeaveGroup}
            disabled={isLeaving}
            className="btn bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20"
          >
            <LogOut size={16} /> Leave Group
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 overflow-hidden flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 relative">
          <LiveChat 
            roomId={group.id} 
            initialMessages={initialMessages}
            userId={userId}
            userProfile={userProfile}
            c={c}
          />
        </div>

        {/* Right Sidebar - Presence */}
        <div className="w-72 flex-none bg-black/20 hidden md:block">
          <div className="p-6">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Active Now
            </h3>
            
            <div className="space-y-3">
              {presence.length === 0 ? (
                <p className="text-sm text-white/30 italic">No one is here right now.</p>
              ) : (
                presence.map(p => (
                  <div key={p.user_id} className="flex items-center gap-3 group">
                    <div className="relative">
                      <img 
                        src={p.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`} 
                        alt={p.user_name}
                        className="w-8 h-8 rounded-full border border-white/10"
                      />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
                        {p.user_name}
                        {p.user_id === userId && <span className="text-xs text-white/30 ml-2">(You)</span>}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {group.topic && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Topic</h3>
                <p className="text-sm text-white/90 font-medium">{group.topic}</p>
              </div>
            )}
            {group.description && (
              <div className="mt-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Description</h3>
                <p className="text-sm text-white/70">{group.description}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Live Chat Component                                                       */
/* ══════════════════════════════════════════════════════════════════════════ */
function LiveChat({ roomId, initialMessages, userId, userProfile, c }) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages]);

  // Sync polling
  useEffect(() => {
    const poll = async () => {
      try {
        const fresh = await fetchRoomMessages(roomId, 100);
        setMessages(fresh);
      } catch (err) {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!draft.trim() || isSending) return;

    const content = draft.trim();
    setDraft("");
    setIsSending(true);

    const tempId = "temp-" + Date.now();
    const newMsg = {
      id: tempId,
      room_id: roomId,
      author_id: userId,
      author_name: userProfile.display_name,
      author_avatar: userProfile.avatar_url,
      content,
      created_at: new Date().toISOString(),
      is_deleted: false,
    };
    setMessages(prev => [...prev, newMsg]);

    try {
      await sendMessage({ roomId, content });
      const fresh = await fetchRoomMessages(roomId, 100);
      setMessages(fresh);
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages
  const grouped = [];
  let currentGroup = null;

  messages.forEach(msg => {
    if (msg.is_deleted) return;
    const msgTime = new Date(msg.created_at).getTime();
    if (!currentGroup) {
      currentGroup = { author_id: msg.author_id, author_name: msg.author_name, author_avatar: msg.author_avatar, messages: [msg] };
    } else {
      const lastTime = new Date(currentGroup.messages[currentGroup.messages.length - 1].created_at).getTime();
      const timeDiff = msgTime - lastTime;
      if (currentGroup.author_id === msg.author_id && timeDiff < 300000) {
        currentGroup.messages.push(msg);
      } else {
        grouped.push(currentGroup);
        currentGroup = { author_id: msg.author_id, author_name: msg.author_name, author_avatar: msg.author_avatar, messages: [msg] };
      }
    }
  });
  if (currentGroup) grouped.push(currentGroup);

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6"
      >
        {grouped.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <MessageCircle size={24} className="text-white/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">No messages yet</p>
              <p className="text-xs text-white/50">Start the conversation!</p>
            </div>
          </div>
        ) : (
          grouped.map((grp, i) => {
            const isMe = grp.author_id === userId;
            return (
              <div key={i} className={`flex gap-4 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}>
                <div className="shrink-0 pt-1">
                  <img 
                    src={grp.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${grp.author_id}`}
                    alt={grp.author_name}
                    className="w-8 h-8 rounded-full border border-white/10"
                  />
                </div>
                
                <div className={`flex flex-col min-w-0 ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-baseline gap-2 mb-1 px-1">
                    <span className="text-xs font-bold text-white/70">{grp.author_name}</span>
                    <span className="text-[10px] text-white/30">
                      {new Date(grp.messages[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                    {grp.messages.map((m, j) => {
                      const isFirst = j === 0;
                      const isLast = j === grp.messages.length - 1;
                      
                      let rounded = "rounded-2xl";
                      if (grp.messages.length > 1) {
                        if (isMe) {
                          if (isFirst) rounded = "rounded-2xl rounded-br-sm";
                          else if (isLast) rounded = "rounded-2xl rounded-tr-sm";
                          else rounded = "rounded-2xl rounded-r-sm";
                        } else {
                          if (isFirst) rounded = "rounded-2xl rounded-bl-sm";
                          else if (isLast) rounded = "rounded-2xl rounded-tl-sm";
                          else rounded = "rounded-2xl rounded-l-sm";
                        }
                      }

                      return (
                        <div 
                          key={m.id}
                          className={`px-4 py-2.5 text-sm ${rounded} ${
                            isMe 
                              ? "bg-indigo-600 text-white" 
                              : "bg-white/10 text-white/90 border border-white/5"
                          } whitespace-pre-wrap break-words`}
                        >
                          {m.content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-xl shrink-0">
        <form 
          onSubmit={handleSend}
          className="max-w-4xl mx-auto relative flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-indigo-500/50 focus-within:bg-white/10 transition-all"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="flex-1 max-h-32 min-h-[40px] bg-transparent border-none resize-none px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none custom-scrollbar"
            rows={1}
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 mb-[2px] mr-[2px]"
          >
            <Send size={16} className={isSending ? "animate-pulse" : ""} />
          </button>
        </form>
        <p className="text-center text-[10px] text-white/30 mt-2 font-medium">
          Messages in this room are temporary and may be cleared periodically.
        </p>
      </div>
    </div>
  );
}
