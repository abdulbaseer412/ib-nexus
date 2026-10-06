"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, ThumbsUp, ChevronRight, MessageSquare, Plus, Clock, Info, Trash2, HelpCircle, CheckCircle2, Check } from "lucide-react";
import { deletePostAction } from "../actions";

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
    "Mathematics": { bg: "rgba(29, 78, 216, 0.15)", text: "#60a5fa", border: "rgba(29, 78, 216, 0.3)" },
    "Physics": { bg: "rgba(180, 83, 9, 0.15)", text: "#fbbf24", border: "rgba(180, 83, 9, 0.3)" },
    "Chemistry": { bg: "rgba(21, 128, 61, 0.15)", text: "#4ade80", border: "rgba(21, 128, 61, 0.3)" },
    "Biology": { bg: "rgba(190, 24, 93, 0.15)", text: "#f472b6", border: "rgba(190, 24, 93, 0.3)" },
    "Computer Science": { bg: "rgba(126, 34, 206, 0.15)", text: "#c084fc", border: "rgba(126, 34, 206, 0.3)" },
    "Economics": { bg: "rgba(194, 65, 12, 0.15)", text: "#fb923c", border: "rgba(194, 65, 12, 0.3)" },
    "English": { bg: "rgba(51, 65, 85, 0.2)", text: "#94a3b8", border: "rgba(51, 65, 85, 0.4)" },
    "TOK": { bg: "rgba(15, 118, 110, 0.15)", text: "#2dd4bf", border: "rgba(15, 118, 110, 0.3)" },
    "Extended Essay": { bg: "rgba(67, 56, 202, 0.15)", text: "#818cf8", border: "rgba(67, 56, 202, 0.3)" }
  };
  return map[cat] || { bg: "rgba(71, 85, 105, 0.15)", text: "#94a3b8", border: "rgba(71, 85, 105, 0.3)" };
}

export default function MyQuestionsClient({ questions: initialQuestions, summary, userId, isAdmin }) {
  const [questions, setQuestions] = useState(initialQuestions);

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#0f0f13]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 p-5 sm:p-10 max-w-5xl mx-auto">
        <header className="mb-8">
          <Link href="/dashboard/community" className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white transition-all duration-300 mb-6 group">
            <span className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
              <ArrowLeft size={16} />
            </span>
            Back to Nexus Network
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  MY COMMUNITY QUESTIONS
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                My Questions
              </h1>
              <p className="text-sm text-white/60 max-w-md">
                Review questions you have asked the community and check for answers from fellow IB students.
              </p>
            </div>
            
            {/* Quick Stats Summary */}
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="text-center px-3 border-r border-white/10">
                <div className="text-xl font-bold text-white">{summary?.discussionsCount || 0}</div>
                <div className="text-[9px] font-medium uppercase tracking-wider text-white/50">Discussions</div>
              </div>
              <div className="text-center px-3 border-r border-white/10">
                <div className="text-xl font-bold text-white">{questions.length}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Questions</div>
              </div>
              <div className="text-center px-3 border-r border-white/10">
                <div className="text-xl font-bold text-teal-400">{summary?.repliesCount || 0}</div>
                <div className="text-[9px] font-medium uppercase tracking-wider text-teal-300">Replies</div>
              </div>
              <div className="text-center px-3">
                <div className="text-xl font-bold text-amber-400">{summary?.answersCount || 0}</div>
                <div className="text-[9px] font-medium uppercase tracking-wider text-amber-300">Answers</div>
              </div>
            </div>
          </div>
        </header>

        {/* Unified 4-Tab Personal Header Switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl w-fit border border-white/5 backdrop-blur-sm">
          <Link
            href="/dashboard/community/my-discussions"
            className="px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-2 text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
          >
            <MessageSquare size={14} className="text-indigo-400" />
            My Discussions ({summary?.discussionsCount || 0})
          </Link>
          <Link
            href="/dashboard/community/my-questions"
            className="px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-2 text-white bg-amber-600/30 border border-amber-500/40 shadow-lg shadow-amber-600/20"
          >
            <HelpCircle size={14} className="text-amber-400" />
            My Questions ({questions.length})
          </Link>
          <Link
            href="/dashboard/community/my-replies"
            className="px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-2 text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
          >
            <MessageCircle size={14} className="text-teal-400" />
            My Replies ({summary?.repliesCount || 0})
          </Link>
          <Link
            href="/dashboard/community/my-answers"
            className="px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-2 text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
          >
            <Check className="w-3.5 h-3.5 text-amber-400" />
            My Answers ({summary?.answersCount || 0})
          </Link>
        </div>

        {/* Content Area */}
        <div className="max-w-4xl space-y-4">
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm">
              <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400">
                <HelpCircle size={28} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No questions asked yet</h3>
              <p className="text-sm text-white/40 max-w-xs text-center mb-6">
                Need help with IB concepts, IAs, or EEs? Ask the community and receive answers!
              </p>
              <Link href="/dashboard/community" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-500/30">
                Ask a Question
              </Link>
            </div>
          ) : (
            questions.map(post => {
              const c = col(post.category);
              return (
                <Link
                  key={post.id}
                  href={`/dashboard/community/${post.id}`}
                  className="group block relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20 hover:shadow-2xl overflow-hidden"
                >
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          QUESTION
                        </span>

                        {post.is_answered ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 size={12} /> Answered
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <HelpCircle size={12} /> Unanswered
                          </span>
                        )}

                        <span
                          className="rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                        >
                          {post.category}
                        </span>

                        {post.status === "pending" && (
                          <span className="flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock size={12} /> Pending Approval
                          </span>
                        )}
                        {post.status === "rejected" && (
                          <span className="flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                            <Info size={12} /> Rejected
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold text-white/90 group-hover:text-white transition-colors leading-snug mb-2">
                        {post.title}
                      </h2>
                      <p className="line-clamp-2 text-sm leading-relaxed text-white/60 mb-4">
                        {post.content}
                      </p>
                      
                      <div className="flex items-center gap-5 text-xs font-medium text-white/40">
                        <span className="flex items-center gap-1.5 text-white/60">
                          <Clock size={14} className="text-white/40" /> 
                          {timeAgo(post.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <MessageCircle size={14} className="text-amber-400" /> 
                          {post.reply_count || 0} Answers
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <ThumbsUp size={14} className="text-emerald-400" /> 
                          {post.helpful_count || 0} Helpful
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this question?")) {
                            setQuestions(prev => prev.filter(p => p.id !== post.id));
                            deletePostAction(post.id).catch(err => {
                              alert(err.message || "Failed to delete question.");
                            });
                          }
                        }}
                        className="h-9 px-3 flex items-center gap-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all shadow-sm"
                        title="Delete Question"
                      >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
