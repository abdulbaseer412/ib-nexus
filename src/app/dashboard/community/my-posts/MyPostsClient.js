"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, ThumbsUp, ChevronDown, ChevronRight, MessageSquare, Plus, Clock, Info } from "lucide-react";

// Shared utility
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

function col(cat) {
  const map = {
    "Mathematics": { bg: "rgba(29, 78, 216, 0.15)", text: "#60a5fa", border: "rgba(29, 78, 216, 0.3)" }, // blue
    "Physics": { bg: "rgba(180, 83, 9, 0.15)", text: "#fbbf24", border: "rgba(180, 83, 9, 0.3)" },     // amber
    "Chemistry": { bg: "rgba(21, 128, 61, 0.15)", text: "#4ade80", border: "rgba(21, 128, 61, 0.3)" },   // green
    "Biology": { bg: "rgba(190, 24, 93, 0.15)", text: "#f472b6", border: "rgba(190, 24, 93, 0.3)" },     // pink
    "Computer Science": { bg: "rgba(126, 34, 206, 0.15)", text: "#c084fc", border: "rgba(126, 34, 206, 0.3)" }, // purple
    "Economics": { bg: "rgba(194, 65, 12, 0.15)", text: "#fb923c", border: "rgba(194, 65, 12, 0.3)" },   // orange
    "English": { bg: "rgba(51, 65, 85, 0.2)", text: "#94a3b8", border: "rgba(51, 65, 85, 0.4)" },     // slate
    "TOK": { bg: "rgba(15, 118, 110, 0.15)", text: "#2dd4bf", border: "rgba(15, 118, 110, 0.3)" },         // teal
    "Extended Essay": { bg: "rgba(67, 56, 202, 0.15)", text: "#818cf8", border: "rgba(67, 56, 202, 0.3)" } // indigo
  };
  return map[cat] || { bg: "rgba(71, 85, 105, 0.15)", text: "#94a3b8", border: "rgba(71, 85, 105, 0.3)" }; // default slate
}

export default function MyPostsClient({ posts, replies, userId, isAdmin }) {
  const [activeTab, setActiveTab] = useState("posts");
  const [expandedReplyId, setExpandedReplyId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedReplyId(expandedReplyId === id ? null : id);
  };

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#0f0f13]">
      
      {/* Background glowing effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 p-5 sm:p-10 max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <Link href="/dashboard/community" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-white transition-all duration-300 mb-6 group">
            <span className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
              <ArrowLeft size={16} />
            </span>
            Back to Nexus Network
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60 mb-2">
                My Discussions
              </h1>
              <p className="text-sm text-muted/80 max-w-md">
                Manage your intellectual contributions, track your ongoing queries, and review your community impact.
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="text-center px-4 border-r border-white/10">
                <div className="text-2xl font-bold text-white">{posts.length}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted">Posts</div>
              </div>
              <div className="text-center px-4">
                <div className="text-2xl font-bold text-white">{replies.length}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted">Comments</div>
              </div>
            </div>
          </div>
        </header>

        {/* Modern Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl w-fit border border-white/5 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("posts")}
            className={`relative px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${
              activeTab === "posts"
                ? "text-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10"
                : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <MessageSquare size={16} className={activeTab === "posts" ? "text-blue-400" : ""} />
            My Posts
          </button>
          <button
            onClick={() => setActiveTab("replies")}
            className={`relative px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${
              activeTab === "replies"
                ? "text-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10"
                : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <MessageCircle size={16} className={activeTab === "replies" ? "text-indigo-400" : ""} />
            My Comments
          </button>
        </div>

        {/* Content Area */}
        <div className="max-w-4xl">
          {activeTab === "posts" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm">
                  <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 text-blue-400">
                    <MessageSquare size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
                  <p className="text-sm text-muted max-w-xs text-center mb-6">
                    You haven't started any discussions. Share your knowledge or ask a question!
                  </p>
                  <Link href="/dashboard/community" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                    Explore Nexus Network
                  </Link>
                </div>
              ) : (
                posts.map(post => {
                  const c = col(post.category);
                  return (
                    <Link
                      key={post.id}
                      href={`/dashboard/community/${post.id}`}
                      className="group block relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Subtle hover gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                        <div className="min-w-0 flex-1">
                          
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span
                              className="rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase"
                              style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                            >
                              {post.category}
                            </span>
                            {post.status === "pending" && (
                              <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock size={12} /> Pending Approval
                              </span>
                            )}
                            {post.status === "rejected" && (
                              <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                                <Info size={12} /> Rejected
                              </span>
                            )}
                          </div>

                          <h2 className="text-lg font-bold text-white/90 group-hover:text-white transition-colors leading-snug mb-2">
                            {post.title}
                          </h2>
                          <p className="line-clamp-2 text-sm leading-relaxed text-muted/90 mb-4">
                            {post.content}
                          </p>
                          
                          {/* Stats Footer */}
                          <div className="flex items-center gap-5 text-xs font-medium text-muted">
                            <span className="flex items-center gap-1.5 text-white/60">
                              <Clock size={14} className="text-white/40" /> 
                              {timeAgo(post.created_at)}
                            </span>
                            <span className="flex items-center gap-1.5 text-white/60">
                              <MessageCircle size={14} className="text-indigo-400/70" /> 
                              {post.reply_count || 0} Replies
                            </span>
                            <span className="flex items-center gap-1.5 text-white/60">
                              <ThumbsUp size={14} className="text-blue-400/70" /> 
                              {post.helpful_count || 0} Helpful
                            </span>
                          </div>
                        </div>
                        
                        {/* Right chevron indicator */}
                        <div className="hidden sm:flex shrink-0 h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/5 text-white/40 group-hover:bg-blue-600/20 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all duration-300">
                          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "replies" && (
            <div className="space-y-5">
              {replies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm">
                  <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400">
                    <MessageCircle size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No comments yet</h3>
                  <p className="text-sm text-muted max-w-xs text-center mb-6">
                    You haven't participated in any discussions yet.
                  </p>
                </div>
              ) : (
                replies.map(reply => {
                  const isExpanded = expandedReplyId === reply.id;
                  const post = reply.community_posts;
                  return (
                    <article key={reply.id} className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-1 overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]">
                      <div className="p-5">
                        {/* Main Comment Focus */}
                        <div className="text-sm font-medium text-white/90 whitespace-pre-wrap leading-relaxed mb-4">
                          "{reply.content}"
                        </div>
                        
                        {/* Comment Footer (Stats & Date) */}
                        <div className="flex items-center gap-5 text-xs font-medium text-muted mb-5 border-b border-white/10 pb-5">
                          <span className="flex items-center gap-1.5 text-white/60">
                            <Clock size={14} className="text-white/40" /> 
                            {timeAgo(reply.created_at)}
                          </span>
                          <span className="flex items-center gap-1.5 text-white/60">
                            <ThumbsUp size={14} className="text-blue-400/70" /> 
                            {reply.helpful_count || 0} Helpful
                          </span>
                        </div>

                        {/* Contextual Accordion */}
                        <div>
                          <button 
                            onClick={() => toggleExpand(reply.id)}
                            className="group flex items-center justify-between w-full p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300"
                          >
                            <span className="flex items-center gap-2 text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
                              <MessageSquare size={14} className={isExpanded ? "text-indigo-400" : "text-white/40"} />
                              {isExpanded ? "Hide thread context" : "View thread context"}
                            </span>
                            <div className={`h-6 w-6 rounded-md bg-black/20 flex items-center justify-center transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                              <ChevronDown size={14} className="text-white/50 group-hover:text-white/80" />
                            </div>
                          </button>
                          
                          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? "max-h-[200px] opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
                            {post ? (
                              <Link href={`/dashboard/community/${post.id}`} className="block relative bg-black/20 border border-white/5 rounded-xl p-4 group/link hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50 rounded-l-xl opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Replying to</p>
                                <h3 className="text-sm font-semibold text-white/90 group-hover/link:text-indigo-300 transition-colors mb-2 line-clamp-1">{post.title}</h3>
                                <div className="flex items-center justify-between">
                                  <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-white/10 text-white/70">
                                    {post.category}
                                  </span>
                                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 opacity-80 group-hover/link:opacity-100">
                                    Jump to discussion <ArrowLeft size={12} className="rotate-180" />
                                  </span>
                                </div>
                              </Link>
                            ) : (
                              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs font-medium text-red-400 flex items-center gap-2">
                                <Info size={14} />
                                Original discussion has been deleted.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
