"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, MessageCircle, ThumbsUp, MessageSquare, Clock, Info, 
  Trash2, HelpCircle, Edit3, X, Check, ExternalLink, Send, AlertCircle 
} from "lucide-react";
import { deleteReplyAction, editReplyAction } from "../actions";

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

export default function MyAnswersClient({ answers: initialAnswers, summary, userId, isAdmin }) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [editingAnswer, setEditingAnswer] = useState(null); // { id, content }
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = (answer) => {
    setEditingAnswer(answer);
    setEditContent(answer.content);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editContent.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await editReplyAction({ replyId: editingAnswer.id, content: editContent.trim() });
      setAnswers(prev => prev.map(a => a.id === editingAnswer.id ? { ...a, content: editContent.trim() } : a));
      setEditingAnswer(null);
    } catch (err) {
      alert(err.message || "Failed to update answer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAnswer = async (answer) => {
    if (!confirm("Delete this answer? It will be removed from the question.")) return;
    try {
      setAnswers(prev => prev.filter(a => a.id !== answer.id));
      await deleteReplyAction(answer.id, answer.post_id);
    } catch (err) {
      alert(err.message || "Failed to delete answer.");
    }
  };

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
                  MY COMMUNITY ANSWERS
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                My Question Answers
              </h1>
              <p className="text-sm text-white/60 max-w-md">
                Answers, solutions, and explanatory guidance you have provided to community questions.
              </p>
            </div>
            
            {/* Quick Stats Summary */}
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="text-center px-3 border-r border-white/10">
                <div className="text-xl font-bold text-white">{summary?.discussionsCount || 0}</div>
                <div className="text-[9px] font-medium uppercase tracking-wider text-white/50">Discussions</div>
              </div>
              <div className="text-center px-3 border-r border-white/10">
                <div className="text-xl font-bold text-white">{summary?.questionsCount || 0}</div>
                <div className="text-[9px] font-medium uppercase tracking-wider text-white/50">Questions</div>
              </div>
              <div className="text-center px-3 border-r border-white/10">
                <div className="text-xl font-bold text-teal-400">{summary?.repliesCount || 0}</div>
                <div className="text-[9px] font-medium uppercase tracking-wider text-teal-300">Replies</div>
              </div>
              <div className="text-center px-3">
                <div className="text-xl font-bold text-amber-400">{summary?.answersCount || answers.length}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Answers</div>
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
            className="px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-2 text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
          >
            <HelpCircle size={14} className="text-amber-400" />
            My Questions ({summary?.questionsCount || 0})
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
            className="px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-2 text-white bg-amber-600/30 border border-amber-500/40 shadow-lg shadow-amber-600/20"
          >
            <Check className="w-3.5 h-3.5 text-amber-400" />
            My Answers ({answers.length})
          </Link>
        </div>

        {/* Content Stream */}
        <div className="max-w-4xl space-y-4">
          {answers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm">
              <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400">
                <HelpCircle size={28} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No answers posted yet</h3>
              <p className="text-sm text-white/40 max-w-xs text-center mb-6">
                You haven't answered any community questions yet. Help fellow students with their IB questions!
              </p>
              <Link href="/dashboard/community" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-500/30">
                Browse Questions
              </Link>
            </div>
          ) : (
            answers.map(answer => {
              const post = answer.community_posts;
              const c = col(post?.category || "General IB");
              const isSolved = post?.is_answered;
              return (
                <div
                  key={answer.id}
                  className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20 hover:shadow-2xl overflow-hidden space-y-4"
                >
                  {/* Parent Question Context Header */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          QUESTION
                        </span>
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                        >
                          {post?.category || "General"}
                        </span>
                        {isSolved ? (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ Answered
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Unanswered
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40 font-medium">
                        Asked by {post?.author_name || "Community Member"}
                      </span>
                    </div>

                    <Link href={`/dashboard/community/${answer.post_id}`} className="block group/link">
                      <h3 className="text-base font-bold text-white/90 group-hover/link:text-amber-300 transition-colors flex items-center gap-1.5">
                        <span>{post?.title || "Question Post"}</span>
                        <ExternalLink size={14} className="text-white/30 group-hover/link:text-amber-300 transition-colors" />
                      </h3>
                    </Link>
                  </div>

                  {/* User's Answer Content */}
                  <div className="pl-4 border-l-2 border-l-amber-500 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-white/40">
                      <span className="text-amber-300 font-extrabold flex items-center gap-1">
                        <Check size={14} className="text-amber-400" /> Your Answer:
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-white/30" />
                        {timeAgo(answer.created_at)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white/90 leading-relaxed whitespace-pre-wrap">
                      {answer.content}
                    </p>
                  </div>

                  {/* Engagement Metrics & Personal Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs font-semibold text-white/40">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ThumbsUp size={13} /> {answer.helpful_count || 0} Helpful
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/community/${answer.post_id}`}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <ExternalLink size={13} />
                        <span>Open Question</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(answer)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAnswer(answer)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Answer Modal */}
      {editingAnswer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121217] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={18} className="text-amber-400" /> Edit Answer
              </h3>
              <button type="button" onClick={() => setEditingAnswer(null)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/5">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-amber-500/50 min-h-[140px] resize-y custom-scrollbar font-medium"
                placeholder="Update your answer content..."
                required
              />

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingAnswer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !editContent.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
