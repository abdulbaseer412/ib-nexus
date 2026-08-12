"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, MessageCircle, ThumbsUp, MoreVertical,
  CheckCircle2, Share, Bookmark, AlertTriangle, Send, Trash2, UserX, Clock, MessageSquare, Flame
} from "lucide-react";
import { 
  createReplyAction, toggleHelpful, toggleBookmark, reportContent, 
  toggleAnswered, deletePostAdmin, deleteReplyAdmin, restrictUserAction, deleteReplyAction, deletePostAction
} from "../actions";
import { useRouter } from "next/navigation";

/* ── Subject colour system ─────────────────────────────────────────────── */
const C = {
  Biology:              { bg: "rgba(16,185,129,.15)",  text: "#34d399", border: "rgba(16,185,129,.3)" },
  Chemistry:            { bg: "rgba(245,158,11,.15)",  text: "#fbbf24", border: "rgba(245,158,11,.3)" },
  Physics:              { bg: "rgba(14,165,233,.15)",  text: "#38bdf8", border: "rgba(14,165,233,.3)" },
  Mathematics:          { bg: "rgba(79,140,255,.15)",  text: "#7aa2ff", border: "rgba(79,140,255,.3)" },
  "Computer Science":   { bg: "rgba(168,85,247,.15)",  text: "#c084fc", border: "rgba(168,85,247,.3)" },
  Economics:            { bg: "rgba(139,92,246,.15)",  text: "#a78bfa", border: "rgba(139,92,246,.3)" },
  "Business Management":{ bg: "rgba(251,146,60,.15)",  text: "#fdba74", border: "rgba(251,146,60,.3)" },
  History:              { bg: "rgba(168,85,247,.15)",  text: "#c084fc", border: "rgba(168,85,247,.3)" },
  Geography:            { bg: "rgba(34,197,94,.15)",   text: "#4ade80", border: "rgba(34,197,94,.3)" },
  English:              { bg: "rgba(236,72,153,.15)",  text: "#f472b6", border: "rgba(236,72,153,.3)" },
  Languages:            { bg: "rgba(244,114,182,.15)", text: "#fbcfe8", border: "rgba(244,114,182,.3)" },
  TOK:                  { bg: "rgba(244,63,94,.15)",   text: "#fb7185", border: "rgba(244,63,94,.3)" },
  "Extended Essay":     { bg: "rgba(251,191,36,.15)",  text: "#fcd34d", border: "rgba(251,191,36,.3)" },
  "Internal Assessment":{ bg: "rgba(96,165,250,.15)",  text: "#93c5fd", border: "rgba(96,165,250,.3)" },
  "Study Tips":         { bg: "rgba(52,211,153,.15)",  text: "#6ee7b7", border: "rgba(52,211,153,.3)" },
  "Exam Preparation":   { bg: "rgba(248,113,113,.15)", text: "#fca5a5", border: "rgba(248,113,113,.3)" },
  "General IB":         { bg: "rgba(148,163,184,.2)",  text: "#cbd5e1", border: "rgba(148,163,184,.4)" },
};
const col = (s) => C[s] || { bg: "rgba(148,163,184,.15)", text: "#cbd5e1", border: "rgba(148,163,184,.3)" };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function DiscussionClient({ post, replies, userId, userProfile, isAdmin }) {
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const c = col(post.category);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createReplyAction({ postId: post.id, content: replyContent });
      setReplyContent("");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to submit reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHelpful = (type, id) => {
    startTransition(async () => {
      await toggleHelpful(type === "post" ? { postId: id } : { replyId: id });
    });
  };

  const handleToggleBookmark = () => {
    startTransition(async () => {
      await toggleBookmark(post.id);
    });
  };

  const handleToggleAnswered = () => {
    if (post.author_id !== userId) return;
    startTransition(async () => {
      await toggleAnswered(post.id);
    });
  };

  const handleDeletePost = async () => {
    if (!confirm("Delete this post completely?")) return;
    startTransition(async () => {
      try {
        if (post.author_id === userId && !isAdmin) {
          await deletePostAction(post.id);
        } else {
          await deletePostAdmin(post.id);
        }
        router.push("/dashboard/community");
      } catch (e) {
        alert(e.message);
      }
    });
  };

  const handleDeleteReply = async (replyId, isOwnReply) => {
    if (!confirm("Delete this reply?")) return;
    startTransition(async () => {
      try {
        if (isOwnReply && !isAdmin) {
          await deleteReplyAction(replyId, post.id);
        } else {
          await deleteReplyAdmin(replyId, post.id);
        }
      } catch (e) {
        alert(e.message);
      }
    });
  };

  const handleRestrictUser = async (targetUserId) => {
    if (!confirm("Restrict this user from commenting?")) return;
    startTransition(async () => {
      try {
        await restrictUserAction(targetUserId);
        alert("User restricted.");
      } catch (e) {
        alert(e.message);
      }
    });
  };

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#0f0f13]">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto p-5 sm:p-8 space-y-8">
        
        {/* Navigation */}
        <Link href="/dashboard/community" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-white transition-all duration-300 group">
          <span className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
            <ArrowLeft size={16} />
          </span>
          Back to Nexus Network
        </Link>

        {/* Main Post */}
        <article className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden backdrop-blur-md">
          {/* Subtle gradient accent based on category */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none" style={{ background: c.bg }} />
          
          <header className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-5 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/40 to-blue-500/40 border border-white/10 shadow-inner flex items-center justify-center text-white font-bold text-lg shrink-0">
                {post.author_avatar ? (
                  <img src={post.author_avatar} alt={post.author_name} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  post.author_name?.[0]?.toUpperCase() || "?"
                )}
              </div>
              <div>
                <p className="font-bold text-white/90 text-lg leading-tight">{post.author_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                    style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                  >
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-white/50">
                    <Clock size={12} className="text-white/30" /> 
                    {timeAgo(post.created_at)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0">
              {isAdmin && (
                <button onClick={() => handleRestrictUser(post.author_id)} className="p-2 text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500/80 transition-all rounded-xl border border-red-500/20 shadow-sm" title="Restrict User">
                  <UserX size={16} />
                </button>
              )}
              {(isAdmin || post.author_id === userId) && (
                <button onClick={handleDeletePost} className="p-2 text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500/80 transition-all rounded-xl border border-red-500/20 shadow-sm" title="Delete Post">
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={handleToggleBookmark} className="p-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all rounded-xl border border-white/10 shadow-sm">
                <Bookmark size={16} />
              </button>
            </div>
          </header>

          {/* Status Badges */}
          {(post.status !== "approved" || post.post_type === "question") && (
            <div className="relative z-10 flex flex-wrap gap-3 mb-6">
              {post.status === "pending" && (
                <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
                  <Clock size={14} /> Pending Approval
                </span>
              )}
              {post.status === "rejected" && (
                <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm">
                  <AlertTriangle size={14} /> Rejected
                </span>
              )}
              {post.post_type === "question" && (
                <span className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold tracking-wide uppercase border shadow-sm ${
                  post.is_answered
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {post.is_answered ? <CheckCircle2 size={14} /> : <MessageSquare size={14} />}
                  {post.is_answered ? "Answered" : "Open Question"}
                </span>
              )}
            </div>
          )}

          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 leading-tight">{post.title}</h1>
            <div className="text-[15px] text-white/80 whitespace-pre-wrap leading-relaxed mb-8 font-medium">
              {post.content}
            </div>
          </div>

          <footer className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10">
            <div className="flex gap-3">
              <button
                onClick={() => handleToggleHelpful("post", post.id)}
                className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-blue-600/20 rounded-xl border border-white/10 hover:border-blue-500/30 text-sm font-bold text-white/80 hover:text-blue-400 transition-all shadow-sm"
              >
                <ThumbsUp size={16} className="group-hover:-translate-y-0.5 transition-transform" /> 
                {post.helpful_count || 0} Helpful
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm font-bold text-white/60 shadow-sm">
                <MessageCircle size={16} /> 
                {post.reply_count || 0} Replies
              </div>
            </div>

            {post.post_type === "question" && post.author_id === userId && (
              <button
                onClick={handleToggleAnswered}
                disabled={isPending}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                  post.is_answered
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
                    : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
                }`}
              >
                <CheckCircle2 size={16} /> {post.is_answered ? "Answered" : "Mark as Answered"}
              </button>
            )}
          </footer>
        </article>

        {/* Replies Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <MessageCircle size={16} />
            </div>
            <h2 className="text-xl font-bold text-white/90">{post.reply_count || 0} Replies</h2>
          </div>

          {/* Reply Form */}
          <form onSubmit={handleReplySubmit} className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.1)] backdrop-blur-sm flex gap-4 sm:gap-5 transition-all focus-within:border-indigo-500/30 focus-within:bg-white/[0.04]">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/40 to-blue-500/40 border border-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner mt-1">
              {userProfile?.display_name?.[0]?.toUpperCase() || userProfile?.full_name?.[0]?.toUpperCase() || "Y"}
            </div>
            <div className="flex-1">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Share your perspective, provide an answer, or continue the discussion..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-white/90 outline-none focus:border-indigo-500/50 focus:bg-white/5 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-muted/50 font-medium text-sm shadow-inner min-h-[100px] resize-y custom-scrollbar mb-4"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !replyContent.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px]"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Send size={15} /> Post Reply</>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Replies List */}
          <div className="space-y-5">
            {replies.map((reply) => (
              <article key={reply.id} className={`relative bg-white/[0.02] border rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.04] hover:shadow-lg ${reply.is_accepted ? 'border-emerald-500/30' : 'border-white/10 hover:border-white/20'}`}>
                <header className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center text-white/90 font-bold text-sm shrink-0">
                      {reply.author_avatar ? (
                        <img src={reply.author_avatar} alt={reply.author_name} className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        reply.author_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white/90 text-[15px]">{reply.author_name}</p>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-white/50 mt-0.5">
                        <Clock size={12} className="text-white/30" /> 
                        {timeAgo(reply.created_at)}
                      </div>
                    </div>
                  </div>
                  {reply.is_accepted && (
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl shadow-sm">
                      <CheckCircle2 size={14} /> Accepted Answer
                    </span>
                  )}
                </header>
                
                <div className="text-[14px] text-white/80 whitespace-pre-wrap leading-relaxed mb-6 font-medium sm:pl-14">
                  {reply.content}
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-4 sm:pl-14 pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleToggleHelpful("reply", reply.id)}
                    className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-blue-600/20 rounded-lg border border-transparent hover:border-blue-500/30 text-xs font-bold text-white/60 hover:text-blue-400 transition-all"
                  >
                    <ThumbsUp size={14} className="group-hover:-translate-y-0.5 transition-transform" /> 
                    {reply.helpful_count || 0} Helpful
                  </button>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <button onClick={() => handleRestrictUser(reply.author_id)} className="px-3 py-1.5 text-xs font-bold text-red-500 hover:text-white bg-red-500/5 hover:bg-red-500/80 transition-all rounded-lg border border-transparent hover:border-red-500/20 flex items-center gap-1.5">
                        <UserX size={12} /> Restrict
                      </button>
                    )}
                    {(isAdmin || reply.author_id === userId) && (
                      <button onClick={() => handleDeleteReply(reply.id, reply.author_id === userId)} className="px-3 py-1.5 text-xs font-bold text-red-500 hover:text-white bg-red-500/5 hover:bg-red-500/80 transition-all rounded-lg border border-transparent hover:border-red-500/20 flex items-center gap-1.5">
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
