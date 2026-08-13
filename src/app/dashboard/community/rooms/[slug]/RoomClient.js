"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, MessageCircle, ThumbsUp, Send, Search,
  ChevronRight, Flame, BookOpen, Radio, FolderOpen,
  HelpCircle, Plus, X, CheckCircle2, AlertCircle, Users,
  Clock, FileText, ChevronDown
} from "lucide-react";
import {
  createPostAction, fetchPostsBySubject, sendMessage,
  updatePresence, fetchRoomMessages, fetchRoomPresence, removePresence
} from "../../actions";

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

/* ── Level label parser ────────────────────────────────────────────────── */
function getLevelLabel(name) {
  if (name.includes("HL")) return "Higher Level";
  if (name.includes("SL")) return "Standard Level";
  if (name.includes("IA") || name.includes("EE")) return "Coursework";
  if (name.includes("Exhibition")) return "Exhibition";
  if (name.includes("Essay")) return "Essay";
  return "General";
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */
const TABS = [
  { key: "overview",    label: "Overview",    icon: Radio },
  { key: "discussions", label: "Discussions", icon: MessageCircle },
  { key: "live-chat",   label: "Live Chat",   icon: Send },
];

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main RoomClient Component                                              */
/* ──────────────────────────────────────────────────────────────────────── */
export default function RoomClient({
  room, initialPosts, trending, initialMessages, initialPresence,
  memberCount, userId, userProfile, isAdmin,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAskModal, setShowAskModal] = useState(false);
  const [presence, setPresence] = useState(initialPresence);

  // 1. Poll for updated presence list (so the UI stays in sync)
  useEffect(() => {
    const pollPresence = async () => {
      try {
        const newPresence = await fetchRoomPresence(room.id);
        setPresence(newPresence);
      } catch {}
    };
    const interval = setInterval(pollPresence, 10000);
    return () => clearInterval(interval);
  }, [room.id]);

  // 2. Manage current user's presence (ONLY when on Live Chat tab)
  useEffect(() => {
    let interval;

    if (activeTab === "live-chat") {
      // Register immediately when joining live chat
      updatePresence(room.id).then(async () => {
        try {
          const newPresence = await fetchRoomPresence(room.id);
          setPresence(newPresence);
        } catch {}
      });

      // Keep presence alive while on live chat
      interval = setInterval(() => {
        updatePresence(room.id).catch(() => {});
      }, 15000);
    } else {
      // Instantly remove when switching to another tab
      removePresence(room.id).then(async () => {
        try {
          const newPresence = await fetchRoomPresence(room.id);
          setPresence(newPresence);
        } catch {}
      });
    }

    // Cleanup when component unmounts entirely (leaving the room)
    return () => {
      if (interval) clearInterval(interval);
      removePresence(room.id).catch(() => {});
    };
  }, [activeTab, room.id]);

  const c = col(room.subject);
  const levelLabel = getLevelLabel(room.name);

  return (
    <main className="relative min-h-[calc(100vh-72px)] bg-[#0f0f13]">
      {/* Subtle ambient glow — subject colored */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-[-15%] right-[-5%] w-[40%] h-[45%] rounded-full blur-[140px] opacity-40"
          style={{ background: c.accent }}
        />
        <div className="absolute bottom-[-20%] left-[-5%] w-[35%] h-[40%] rounded-full bg-indigo-600/8 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 py-6">

        {/* ── Room Header ──────────────────────────────────────────── */}
        <header className="mb-8">
          {/* Back link */}
          <Link
            href="/dashboard/community"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-5 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Explore Spaces
          </Link>

          {/* Subject + Room name */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5"
                style={{ color: c.text }}
              >
                {room.subject}
              </p>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                {room.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-white/50">
                <span>{levelLabel}</span>
                <span className="text-white/20">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: c.accent }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: c.accent }} />
                  </span>
                  {presence.length} online
                </span>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-1 mt-6 border-b border-white/5 -mb-px">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                    isActive
                      ? "text-white border-current"
                      : "text-white/40 border-transparent hover:text-white/70 hover:border-white/10"
                  }`}
                  style={isActive ? { color: c.text, borderColor: c.accent } : undefined}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </header>

        {/* ── Tab Content ──────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <OverviewTab
            room={room}
            trending={trending}
            posts={initialPosts}
            presence={presence}
            c={c}
            onAsk={() => setShowAskModal(true)}
            onSwitchTab={setActiveTab}
          />
        )}
        {activeTab === "discussions" && (
          <DiscussionsTab
            room={room}
            initialPosts={initialPosts}
            c={c}
            onAsk={() => setShowAskModal(true)}
          />
        )}
        {activeTab === "live-chat" && (
          <LiveChatTab
            room={room}
            initialMessages={initialMessages}
            presence={presence}
            userId={userId}
            userProfile={userProfile}
            c={c}
          />
        )}
      </div>

      {/* Ask the Nexus Network Modal */}
      {showAskModal && (
        <AskModal
          room={room}
          c={c}
          onClose={() => setShowAskModal(false)}
        />
      )}
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  OVERVIEW TAB                                                            */
/* ══════════════════════════════════════════════════════════════════════════ */
function OverviewTab({ room, trending, posts, presence, c, onAsk, onSwitchTab }) {
  return (
    <div className="space-y-8">

      {/* Trending */}
      {trending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} style={{ color: c.text }} />
            <h2 className="text-sm font-bold text-white/80">
              Trending in {room.name}
            </h2>
          </div>
          <div className="space-y-3">
            {trending.map(post => (
              <Link
                key={post.id}
                href={`/dashboard/community/${post.id}`}
                className="group block rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
              >
                <p className="text-white/90 font-semibold group-hover:text-white transition-colors line-clamp-1">
                  {post.title}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <MessageCircle size={12} /> {post.reply_count || 0} replies
                  </span>
                  <span>{timeAgo(post.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Discussions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white/80">Recent Discussions</h2>
          <button
            onClick={() => onSwitchTab("discussions")}
            className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{ color: c.text }}
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
            <p className="text-white/40 text-sm">No discussions yet in {room.name}.</p>
            <button
              onClick={onAsk}
              className="mt-4 text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ color: c.text }}
            >
              Be the first to start a discussion →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.slice(0, 5).map(post => (
              <Link
                key={post.id}
                href={`/dashboard/community/${post.id}`}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80 font-medium group-hover:text-white transition-colors truncate">
                    {post.title}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {post.author_name} • {timeAgo(post.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/30 shrink-0 ml-4">
                  <span className="flex items-center gap-1">
                    <MessageCircle size={11} /> {post.reply_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={11} /> {post.helpful_count || 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Studying Now */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: c.accent }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: c.accent }} />
          </span>
          <h2 className="text-sm font-bold text-white/80">
            {presence.length} {presence.length === 1 ? "student" : "students"} studying {room.name}
          </h2>
        </div>
        {presence.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-white/40 text-sm">No one is online right now.</p>
            <button
              onClick={() => onSwitchTab("live-chat")}
              className="mt-3 text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ color: c.text }}
            >
              Join the chat →
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presence.slice(0, 12).map(user => (
              <div
                key={user.user_id}
                className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                {user.user_avatar ? (
                  <img src={user.user_avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/50">
                    {user.user_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <span className="text-xs font-medium text-white/70">{user.user_name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Action */}
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
        <p className="text-white/60 text-sm mb-4">Have a question about {room.subject}?</p>
        <button
          onClick={onAsk}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${c.accent}, ${c.accent}cc)`,
            boxShadow: `0 0 20px ${c.accent}25`,
          }}
        >
          <Plus size={15} /> Ask the Nexus Network
        </button>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  DISCUSSIONS TAB                                                         */
/* ══════════════════════════════════════════════════════════════════════════ */
function DiscussionsTab({ room, initialPosts, c, onAsk }) {
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "questions", label: "Questions" },
  ];

  const handleFilter = (f) => {
    setFilter(f);
    startTransition(async () => {
      const data = await fetchPostsBySubject(room.subject, { filter: f });
      setPosts(data);
    });
  };

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => handleFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              filter === f.key
                ? "text-white border"
                : "text-white/40 bg-white/[0.02] border border-white/5 hover:text-white/70 hover:border-white/10"
            }`}
            style={filter === f.key ? { background: c.bg, color: c.text, borderColor: c.accent + "40" } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Post list */}
      {isPending ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
          <MessageCircle size={32} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/40 text-sm">No discussions found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <Link
              key={post.id}
              href={`/dashboard/community/${post.id}`}
              className="group block rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    {post.post_type === "question" && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-amber-400 border-amber-500/20 bg-amber-500/10">
                        Q
                      </span>
                    )}
                    {post.is_answered && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                        Answered
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/90 font-semibold group-hover:text-white transition-colors line-clamp-1">
                    {post.title}
                  </p>
                  <p className="text-xs text-white/30 mt-1.5">
                    {post.author_name} • {timeAgo(post.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/30 shrink-0">
                  <span className="flex items-center gap-1">
                    <MessageCircle size={12} /> {post.reply_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={12} /> {post.helpful_count || 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Ask CTA */}
      <section className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
        <p className="text-white/60 text-sm mb-4">Have a question about {room.subject}?</p>
        <button
          onClick={onAsk}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${c.accent}, ${c.accent}cc)`,
            boxShadow: `0 0 20px ${c.accent}25`,
          }}
        >
          <Plus size={15} /> Ask the Nexus Network
        </button>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  LIVE CHAT TAB                                                           */
/* ══════════════════════════════════════════════════════════════════════════ */
function LiveChatTab({ room, initialMessages, presence, userId, userProfile, c }) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on mount and new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newMsgs = await fetchRoomMessages(room.id, 80);
        setMessages(newMsgs);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [room.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({ roomId: room.id, content: newMessage });
      setNewMessage("");
      // Immediately refresh
      const newMsgs = await fetchRoomMessages(room.id, 80);
      setMessages(newMsgs);
      inputRef.current?.focus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 300px)", minHeight: "400px" }}>
      {/* Online count */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: c.accent }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: c.accent }} />
        </span>
        <span className="text-xs font-semibold text-white/50">
          {presence.length} {presence.length === 1 ? "student" : "students"} online
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.01] p-4 custom-scrollbar space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Send size={28} className="text-white/10 mb-3" />
            <p className="text-white/30 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.author_id === userId;
            const showAuthor = i === 0 || messages[i - 1].author_id !== msg.author_id;
            
            // Determine border radius based on consecutive messages
            const isLastOfGroup = i === messages.length - 1 || messages[i + 1].author_id !== msg.author_id;
            
            let rounded = "rounded-2xl";
            if (!showAuthor && !isLastOfGroup) {
              rounded = isOwn ? "rounded-2xl rounded-r-sm" : "rounded-2xl rounded-l-sm";
            } else if (showAuthor && !isLastOfGroup) {
              rounded = isOwn ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm";
            } else if (!showAuthor && isLastOfGroup) {
              rounded = isOwn ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm";
            }

            return (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isOwn ? "ml-auto flex-row-reverse" : ""} ${showAuthor && i > 0 ? "mt-4" : "mt-1"}`}>
                <div className="shrink-0 flex items-end">
                  {isLastOfGroup ? (
                    <Avatar url={msg.author_avatar} name={msg.author_name} size="md" />
                  ) : (
                    <div className="w-9" />
                  )}
                </div>

                <div className={`flex flex-col min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
                  {showAuthor && (
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-white/70">{isOwn ? "You" : msg.author_name}</span>
                      <span className="text-[10px] text-white/30">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  
                  <div className={`px-4 py-2.5 text-sm ${rounded} ${
                    isOwn 
                      ? "bg-indigo-600 text-white" 
                      : "bg-white/10 text-white/90 border border-white/5"
                  } whitespace-pre-wrap break-words`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-3 mt-4 shrink-0">
        <input
          ref={inputRef}
          type="text"
          placeholder={`Message ${room.name}...`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          maxLength={2000}
          className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
        />
        <button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="px-4 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-30 shrink-0"
          style={{ background: c.accent }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ASK MODAL                                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
function AskModal({ room, c, onClose }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("question");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setErrorMsg("Please enter a title."); return; }
    if (!content.trim()) { setErrorMsg("Please enter content."); return; }

    setStatus("submitting");
    setErrorMsg("");

    try {
      await createPostAction({
        title,
        content,
        category: room.subject,
        postType,
      });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="bg-[#121217] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Question Submitted!</h3>
          <p className="text-white/50 text-sm mb-8">
            Your question has been submitted and will appear in the community shortly.
          </p>
          <button
            onClick={() => {
              onClose();
              window.location.reload();
            }}
            className="w-full py-3 bg-white hover:bg-white/90 text-black text-sm font-bold rounded-xl transition-all"
          >
            Back to {room.name}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121217] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl relative overflow-hidden">
        {/* Accent glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-24 blur-[80px] opacity-20 pointer-events-none"
          style={{ background: c.accent }}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
          <h3 className="text-lg font-bold text-white">
            Ask the {room.name} Network
          </h3>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 relative z-10">
          {/* Post type toggle */}
          <div className="flex gap-2 bg-white/[0.03] p-1 rounded-xl w-fit border border-white/5">
            <button
              type="button"
              onClick={() => setPostType("question")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                postType === "question" ? "bg-white/10 text-white border border-white/10" : "text-white/40 border border-transparent"
              }`}
            >
              <HelpCircle size={13} /> Question
            </button>
            <button
              type="button"
              onClick={() => setPostType("discussion")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                postType === "discussion" ? "bg-white/10 text-white border border-white/10" : "text-white/40 border border-transparent"
              }`}
            >
              <MessageCircle size={13} /> Discussion
            </button>
          </div>

          {/* Category badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Posting to:</span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg border"
              style={{ color: c.text, background: c.bg, borderColor: c.accent + "30" }}
            >
              {room.subject}
            </span>
          </div>

          <div>
            <input
              type="text"
              placeholder="What's your question?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div>
            <textarea
              placeholder="Add more details..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors resize-none custom-scrollbar"
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-300">{errorMsg}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="flex-1 py-3 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: c.accent }}
            >
              {status === "submitting" ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send size={14} /> Post {postType === "question" ? "Question" : "Discussion"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
