"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PenLine, Search, Users, MessageCircle, ThumbsUp, ChevronRight,
  TrendingUp, Bookmark, Plus, X, CheckCircle2, Circle, Filter,
  Hash, Compass, User, Clock, ChevronDown, Activity, Sparkles, FolderOpen, LayoutGrid, Trash2, ShieldAlert,
  Flame, HelpCircle, Send, AlertCircle
} from "lucide-react";
import { 
  createPostAction, 
  fetchApprovedPosts, 
  fetchActiveStudentsPerSubject, 
  requestStudyGroup, 
  fetchStudyGroupPresenceCounts, 
  createSubjectRoomAction,
  deleteSubjectRoomAction,
  deleteSubjectCategoryAction,
  moderateStudyGroupAction
} from "./actions";

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

const FILTERS = [
  { key: "recent", label: "Recent", icon: Clock },
  { key: "most-helpful", label: "Most Helpful", icon: Flame },
  { key: "unanswered", label: "Unanswered", icon: HelpCircle },
];

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

/* ── Custom Select Component ────────────────────────────────────────────────── */
function CustomSelect({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full sm:w-auto shrink-0 group" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:min-w-[220px] flex items-center justify-between bg-black/40 border border-white/10 hover:border-white/30 text-white/90 text-sm font-semibold rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-inner"
      >
        <span className="truncate">{value === "All" ? "All Subjects" : (value || placeholder)}</span>
        <ChevronDown size={16} className={`text-muted/60 transition-transform duration-300 ${isOpen ? "rotate-180 text-indigo-400" : "group-hover:text-indigo-400"}`} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#121217] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
            <button
              type="button"
              onClick={() => { onChange("All"); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                value === "All" ? "bg-indigo-500/20 text-indigo-300" : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              All Subjects
            </button>
            {options.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => { onChange(cat); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  value === cat ? "bg-indigo-500/20 text-indigo-300" : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityClient({ initialPosts = [], rooms = [], activeStudents = {}, studyGroups = [], studyGroupPresence = {}, userId, userProfile, isAdmin, subjects = [] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [liveStudents, setLiveStudents] = useState(activeStudents);
  const [liveStudyGroups, setLiveStudyGroups] = useState(studyGroupPresence || {});
  const [activeFilter, setActiveFilter] = useState("recent");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPost, setShowNewPost] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [showRequestStudyGroupModal, setShowRequestStudyGroupModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const [freshStudents, freshStudyGroups] = await Promise.all([
          fetchActiveStudentsPerSubject(),
          fetchStudyGroupPresenceCounts()
        ]);
        setLiveStudents(freshStudents);
        setLiveStudyGroups(freshStudyGroups);
      } catch {}
    };

    fetchStudents(); // Sync immediately on navigation
    const interval = setInterval(fetchStudents, 15000);
    return () => clearInterval(interval);
  }, []);

  // Group rooms by subject
  const roomsBySubject = {};
  rooms.forEach(r => {
    if (!roomsBySubject[r.subject]) roomsBySubject[r.subject] = [];
    roomsBySubject[r.subject].push(r);
  });

  // Group live students by Subject for the 'Live Now' bar
  const liveStudentsBySubject = {};
  Object.values(liveStudents).forEach(roomData => {
    if (liveStudentsBySubject[roomData.subject] === undefined) {
      liveStudentsBySubject[roomData.subject] = 0;
    }
    liveStudentsBySubject[roomData.subject] += roomData.count;
  });

  const activeSubjects = Object.entries(liveStudentsBySubject)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const handleFilterChange = (filter, category) => {
    startTransition(async () => {
      const newPosts = await fetchApprovedPosts({
        filter: filter || activeFilter,
        category: category || activeCategory,
        search: searchQuery || null,
      });
      setPosts(newPosts);
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    startTransition(async () => {
      const newPosts = await fetchApprovedPosts({
        filter: activeFilter,
        category: activeCategory,
        search: searchQuery || null,
      });
      setPosts(newPosts);
    });
  };

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#0f0f13]">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-600/5 blur-[120px]" />
      </div>

      <div className="relative z-10 p-5 sm:p-8 max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60 mb-2">
              Nexus Network
            </h1>
            <p className="text-sm text-muted/80 max-w-lg">
              A premium space to learn together, ask questions, and collaborate with IB students worldwide.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.02)] backdrop-blur-md">
              <button 
                onClick={() => setShowExploreModal(true)} 
                className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-semibold text-white/80 hover:text-white transition-all group"
              >
                <LayoutGrid size={15} className="text-indigo-400 group-hover:scale-110 transition-transform" /> 
                Browse Rooms
              </button>
              <div className="w-px h-4 bg-white/10" />
              <Link 
                href="/dashboard/community/my-posts" 
                className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-semibold text-white/80 hover:text-white transition-all group"
              >
                <FolderOpen size={15} className="text-white/50 group-hover:text-white transition-colors" /> 
                My Discussions
              </Link>
            </div>
            
            <button 
              onClick={() => setShowNewPost(true)} 
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-sm font-bold text-white transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5"
            >
              <PenLine size={16} /> 
              New Discussion
            </button>
          </div>
        </header>

        {/* Live Now Section */}
        {activeSubjects.length > 0 && (
          <section className="mb-8 relative z-20">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-emerald-500/80">Live Now</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {activeSubjects.map(([subject, count]) => {
                const c = col(subject);
                const firstRoom = roomsBySubject[subject]?.[0];
                return (
                  <Link
                    key={subject}
                    href={firstRoom ? `/dashboard/community/rooms/${firstRoom.slug}` : "#"}
                    className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-3 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 shrink-0 backdrop-blur-sm group"
                  >
                    <div>
                      <p className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">{subject}</p>
                      <p className="text-[11px] font-medium text-emerald-400/80">{count} student{count !== 1 ? "s" : ""} active</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-6">
          
          {/* Unified Search and Filter Hub */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative mb-6 group z-10">
              <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted/60 group-focus-within:text-blue-400 transition-colors duration-300" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-12 text-white/90 outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-muted/50 font-medium text-sm shadow-inner"
                placeholder="Search discussions by keyword, subject, or author..."
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => {
                    setSearchQuery("");
                    startTransition(async () => {
                      const newPosts = await fetchApprovedPosts({
                        filter: activeFilter,
                        category: activeCategory,
                        search: null,
                      });
                      setPosts(newPosts);
                    });
                  }} 
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              )}
            </form>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between relative z-20">
              {/* Primary Filters (Segmented Controls) */}
              <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 self-stretch sm:self-auto overflow-x-auto hide-scrollbar">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setActiveFilter(f.key); handleFilterChange(f.key); }}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 flex-1 sm:flex-none whitespace-nowrap ${
                      activeFilter === f.key
                        ? "bg-white/15 text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] border border-white/10"
                        : "text-muted/80 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <f.icon size={15} className={activeFilter === f.key ? (f.key === 'recent' ? 'text-blue-400' : f.key === 'most-helpful' ? 'text-amber-400' : 'text-emerald-400') : "opacity-70"} /> 
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Custom Category Dropdown */}
              <CustomSelect 
                value={activeCategory} 
                onChange={(val) => { setActiveCategory(val); handleFilterChange(null, val); }} 
                options={["All", ...subjects]} 
              />
            </div>
          </div>

          {/* Discussion List */}
          {isPending && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          )}

          {!isPending && posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-24 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm">
              <div className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No discussions found</h3>
              <p className="mt-2 text-sm text-muted/80 max-w-sm">
                We couldn't find any discussions matching your current filters. Be the first to start one!
              </p>
              <button onClick={() => setShowNewPost(true)} className="px-6 py-3 mt-8 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl">
                Start a new discussion
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => {
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
                          {post.post_type === "question" && (
                            <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase border ${
                              post.is_answered
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}>
                              {post.is_answered ? <CheckCircle2 size={12} /> : <HelpCircle size={12} />}
                              {post.is_answered ? "Answered" : "Open Question"}
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
                        <div className="flex items-center gap-6 text-xs font-semibold text-muted">
                          <span className="flex items-center gap-2 text-white/70">
                            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-500/40 to-blue-500/40 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
                              {post.author_name?.[0]?.toUpperCase()}
                            </div>
                            {post.author_name}
                          </span>
                          <span className="flex items-center gap-1.5 text-white/50">
                            <Clock size={14} className="text-white/30" /> 
                            {timeAgo(post.created_at)}
                          </span>
                          <span className="flex items-center gap-1.5 text-white/50">
                            <MessageCircle size={14} className="text-indigo-400/70" /> 
                            {post.reply_count || 0}
                          </span>
                          <span className="flex items-center gap-1.5 text-white/50">
                            <ThumbsUp size={14} className="text-blue-400/70" /> 
                            {post.helpful_count || 0}
                          </span>
                        </div>
                      </div>
                      
                      {/* Right chevron indicator */}
                      <div className="hidden sm:flex shrink-0 h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/5 text-white/40 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all duration-300">
                        <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Explore Spaces Modal */}
      {showExploreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121217] border border-white/10 rounded-[2rem] max-w-5xl w-full h-full max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Modal Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="flex items-center justify-between p-6 sm:px-8 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Compass size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Explore Spaces</h3>
                  <p className="text-xs text-muted font-medium mt-1">Discover subject rooms and study groups</p>
                </div>
              </div>
              <button onClick={() => setShowExploreModal(false)} className="rounded-xl p-2.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 relative z-10">
              <div className="grid lg:grid-cols-2 gap-8">
                
                {/* Subject Rooms Column */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white/90">Subject Rooms</h3>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsDeleteMode(!isDeleteMode)}
                          className={`btn px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                            isDeleteMode 
                              ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white'
                              : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
                          }`}
                          title="Toggle Delete Mode"
                        >
                          <Trash2 size={14} /> {isDeleteMode ? "Done" : "Manage"}
                        </button>
                        <button
                          onClick={() => setShowAddSubjectModal(true)}
                          className="btn bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-500/30 transition-all flex items-center gap-1.5"
                        >
                          <Plus size={14} /> Add Subject
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(roomsBySubject).map(([subject, subjectRooms]) => {
                      const c = col(subject);
                      return (
                        <div key={subject} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest pl-1" style={{ color: c.text }}>
                              {subject}
                            </p>
                            {isAdmin && isDeleteMode && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (confirm(`Are you sure you want to delete the entire '${subject}' category and all its rooms?`)) {
                                    startTransition(async () => {
                                      try {
                                        await deleteSubjectCategoryAction(subject);
                                      } catch (err) {
                                        alert(err.message);
                                      }
                                    });
                                  }
                                }}
                                className="text-white/30 hover:text-red-400 transition-colors p-1"
                                title="Delete Subject Category"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {subjectRooms.map(room => {
                              // Parse out room levels for elegant badges
                              const isHL = room.name.includes("HL");
                              const isSL = room.name.includes("SL");
                              const isIA = room.name.includes("IA") || room.name.includes("EE") || room.name.includes("Essay") || room.name.includes("Exhibition");
                              const isGeneral = !isHL && !isSL && !isIA;

                              return (
                                <Link
                                  key={room.id}
                                  href={`/dashboard/community/rooms/${room.slug}`}
                                  className="group relative flex flex-col justify-center rounded-xl px-3 py-2.5 text-sm transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-white/10"
                                >
                                  <div className="flex items-center justify-between z-10 w-full gap-2">
                                    <span className="text-white/80 group-hover:text-white font-medium flex items-center gap-2 truncate">
                                      <span className="truncate">{room.name.replace("HL", "").replace("SL", "").trim()}</span>
                                    </span>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      {isAdmin && isDeleteMode && (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            if (confirm(`Are you sure you want to delete the room '${room.name}'?`)) {
                                              startTransition(async () => {
                                                try {
                                                  await deleteSubjectRoomAction(room.id);
                                                } catch (err) {
                                                  alert(err.message);
                                                }
                                              });
                                            }
                                          }}
                                          className="text-white/20 hover:text-red-400 transition-colors mr-1 p-0.5"
                                          title="Delete Room"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                      {isHL && (
                                        <div className="group/badge relative flex items-center">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border border-rose-500/30 text-rose-400 bg-rose-500/10 cursor-help">HL</span>
                                          <div className="pointer-events-none absolute bottom-full mb-2 right-0 w-max max-w-[200px] opacity-0 translate-y-2 group-hover/badge:opacity-100 group-hover/badge:translate-y-0 transition-all duration-200 z-[100]">
                                            <div className="bg-[#1a1a24] border border-white/10 shadow-2xl rounded-xl px-3 py-2 text-right backdrop-blur-xl">
                                              <p className="text-xs font-bold text-rose-400">Higher Level (HL)</p>
                                              <p className="text-[10px] text-white/60 font-medium mt-1 leading-tight">For students taking the advanced, more rigorous version of this subject.</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {isSL && (
                                        <div className="group/badge relative flex items-center">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10 cursor-help">SL</span>
                                          <div className="pointer-events-none absolute bottom-full mb-2 right-0 w-max max-w-[200px] opacity-0 translate-y-2 group-hover/badge:opacity-100 group-hover/badge:translate-y-0 transition-all duration-200 z-[100]">
                                            <div className="bg-[#1a1a24] border border-white/10 shadow-2xl rounded-xl px-3 py-2 text-right backdrop-blur-xl">
                                              <p className="text-xs font-bold text-blue-400">Standard Level (SL)</p>
                                              <p className="text-[10px] text-white/60 font-medium mt-1 leading-tight">For students taking the standard, core version of this subject.</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {isIA && (
                                        <div className="group/badge relative flex items-center">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10 cursor-help">CW</span>
                                          <div className="pointer-events-none absolute bottom-full mb-2 right-0 w-max max-w-[200px] opacity-0 translate-y-2 group-hover/badge:opacity-100 group-hover/badge:translate-y-0 transition-all duration-200 z-[100]">
                                            <div className="bg-[#1a1a24] border border-white/10 shadow-2xl rounded-xl px-3 py-2 text-right backdrop-blur-xl">
                                              <p className="text-xs font-bold text-amber-400">Coursework & Projects</p>
                                              <p className="text-[10px] text-white/60 font-medium mt-1 leading-tight">Help with mandatory research papers, essays, and internal projects.</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {isGeneral && (
                                        <div className="group/badge relative flex items-center">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/10 text-white/40 bg-white/5 cursor-help">GEN</span>
                                          <div className="pointer-events-none absolute bottom-full mb-2 right-0 w-max max-w-[200px] opacity-0 translate-y-2 group-hover/badge:opacity-100 group-hover/badge:translate-y-0 transition-all duration-200 z-[100]">
                                            <div className="bg-[#1a1a24] border border-white/10 shadow-2xl rounded-xl px-3 py-2 text-right backdrop-blur-xl">
                                              <p className="text-xs font-bold text-white/80">General Discussion</p>
                                              <p className="text-[10px] text-white/60 font-medium mt-1 leading-tight">Open chat for study tips, questions, and general subject advice.</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Active indicator */}
                                  {liveStudents[room.slug]?.count > 0 && (
                                    <div className="absolute top-0 right-0 h-full w-0.5 bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right Column: Groups & Trending */}
                <div className="space-y-8">
                  

                  {/* Study Groups */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                          <Users size={16} />
                        </div>
                        <h3 className="text-lg font-bold text-white/90 flex items-center gap-2">
                          Study Groups
                          <div className="group relative flex items-center">
                            <HelpCircle size={14} className="text-white/40 hover:text-white/80 cursor-help transition-colors" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-[#1a1a24] border border-white/10 rounded-lg text-xs text-white/80 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                              Student-led temporary rooms for specific topics, exam prep, or peer review. Requires admin approval.
                            </div>
                          </div>
                        </h3>
                      </div>
                      <button 
                        onClick={() => setShowRequestStudyGroupModal(true)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/50 text-white/70 hover:text-indigo-400 transition-colors"
                        title="Request Study Group"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {studyGroups.length === 0 ? (
                      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-8 text-center flex flex-col items-center justify-center shadow-inner">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />
                        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
                        
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/30 relative z-10 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                          <Users size={20} />
                        </div>
                        
                        <h4 className="text-lg font-extrabold text-white mb-2 relative z-10">Student-Led Study Groups</h4>
                        
                        <p className="text-sm font-medium text-white/70 mb-6 leading-relaxed max-w-sm relative z-10">
                          Need a focused space for exam prep or IA peer review? Request a custom study group! Once <span className="text-indigo-400 font-bold">approved by an admin</span>, it will be created instantly for everyone to join.
                        </p>
                        
                        <button 
                          onClick={() => setShowRequestStudyGroupModal(true)}
                          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center gap-2 relative z-10"
                        >
                          <Plus size={16} /> Request Study Group
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {studyGroups.slice(0, 5).map(group => {
                          const c = col(group.subject);
                          const memberCount = group.community_study_group_members?.[0]?.count || 0;
                          const presence = liveStudyGroups[group.id];
                          const isLive = presence?.live > 0;
                          const lastActive = presence?.lastActive ? timeAgo(presence.lastActive) : null;
                          
                          return (
                            <div key={group.id} className="group relative rounded-2xl border border-white/5 bg-black/30 p-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20">
                              <div className="flex items-center justify-between relative z-10">
                                <div className="min-w-0 pr-3">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-bold text-white/90 group-hover:text-white">{group.name}</p>
                                    {isLive ? (
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                      </span>
                                    ) : lastActive ? (
                                      <span className="text-[10px] text-white/40 font-medium whitespace-nowrap">Active {lastActive}</span>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-muted">
                                    <span className="rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                                      {group.subject}
                                    </span>
                                    <span className="flex items-center gap-1"><Users size={10} className="opacity-70"/> {memberCount}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isAdmin && isDeleteMode && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (confirm(`Are you sure you want to delete the study group '${group.name}'?`)) {
                                          startTransition(async () => {
                                            try {
                                              await moderateStudyGroupAction(group.id, "reject");
                                            } catch (err) {
                                              alert(err.message);
                                            }
                                          });
                                        }
                                      }}
                                      className="shrink-0 px-2.5 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 text-white/50 hover:text-red-400 rounded-xl transition-all shadow-sm"
                                      title="Delete Study Group"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => router.push(`/dashboard/community/study-groups/${group.id}`)}
                                    className="shrink-0 px-4 py-2 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-500 text-xs font-bold text-white rounded-xl transition-all shadow-sm"
                                  >
                                    Join
                                  </button>
                                </div>
                              </div>

                              {/* Hover Details Tooltip */}
                              {(group.topic || group.description) && (
                                <div className="absolute left-0 top-full mt-2 w-full p-4 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-50">
                                  {group.topic && (
                                    <div className={group.description ? "mb-3" : ""}>
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Topic</span>
                                      <p className="text-xs font-medium text-white/90 mt-0.5">{group.topic}</p>
                                    </div>
                                  )}
                                  {group.description && (
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Description</span>
                                      <p className="text-xs text-white/70 mt-0.5 line-clamp-3">{group.description}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explore Spaces Modal */}
      {showAddSubjectModal && isAdmin && (
        <AddSubjectRoomModal 
          onClose={() => setShowAddSubjectModal(false)} 
          subjects={subjects} 
        />
      )}

      {/* New Discussion Modal */}
      {showNewPost && (
        <NewPostModal onClose={() => setShowNewPost(false)} subjects={subjects} />
      )}

      {/* Request Study Group Modal */}
      {showRequestStudyGroupModal && (
        <RequestStudyGroupModal onClose={() => setShowRequestStudyGroupModal(false)} subjects={subjects} />
      )}

    </main>
  );
}

/* ── Add Subject Room Modal (Admin Only) ────────────────────────────────── */
function AddSubjectRoomModal({ onClose, subjects }) {
  const [subjectType, setSubjectType] = useState("existing"); // "existing" or "new"
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "");
  const [newSubject, setNewSubject] = useState("");
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const finalSubject = subjectType === "new" ? newSubject : selectedSubject;
    if (!finalSubject.trim() || !roomName.trim()) {
      alert("Subject and Room Name are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createSubjectRoomAction({
          name: roomName,
          subject: finalSubject,
          description: description
        });
        onClose();
      } catch (err) {
        alert(err.message || "Failed to create subject room.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121217] border border-white/10 rounded-3xl max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/20 blur-[60px] pointer-events-none" />
        
        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="text-indigo-400" size={20} /> Add Subject Room
          </h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 relative z-10">
          <div className="space-y-5">
            
            {/* Subject Category */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2 pl-1">
                Subject Category
              </label>
              <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex gap-2 w-full mb-3">
                <button
                  type="button"
                  onClick={() => setSubjectType("existing")}
                  className={`flex-1 flex justify-center items-center gap-2 rounded-xl py-2 text-sm font-bold transition-all duration-300 ${
                    subjectType === "existing"
                      ? "bg-white/15 text-white shadow-sm border border-white/10"
                      : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  Existing Subject
                </button>
                <button
                  type="button"
                  onClick={() => setSubjectType("new")}
                  className={`flex-1 flex justify-center items-center gap-2 rounded-xl py-2 text-sm font-bold transition-all duration-300 ${
                    subjectType === "new"
                      ? "bg-white/15 text-white shadow-sm border border-white/10"
                      : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  New Subject
                </button>
              </div>

              {subjectType === "existing" ? (
                <CustomSelect 
                  value={selectedSubject} 
                  onChange={setSelectedSubject} 
                  options={subjects}
                  placeholder="Select a specific category..."
                />
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Astrophysics"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              )}
            </div>

            {/* Room Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5 ml-1 flex justify-between">
                <span>Room Name</span>
                <span className="text-white/40 text-[10px]">Add "HL", "SL", or "IA/EE" for badges</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Biology HL, or Biology IA & EE"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5 ml-1">
                Description (Optional)
              </label>
              <textarea
                placeholder="Brief description of this room..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all min-h-[80px] resize-none"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (subjectType === "new" ? !newSubject.trim() : !selectedSubject.trim()) || !roomName.trim()}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 transition-all"
            >
              {isPending ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Request Study Group Modal ───────────────────────────────────────────── */
function RequestStudyGroupModal({ onClose, subjects }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState(subjects[0] || "");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      await requestStudyGroup({ name, subject, topic, description });
      setStatus("success");
    } catch {
      setStatus("idle");
      alert("Failed to submit request.");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121217] border border-white/10 rounded-3xl max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/20 blur-[60px] pointer-events-none" />
        
        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="text-indigo-400" size={20} /> Request a Study Group
          </h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {status === "success" ? (
          <div className="p-8 text-center flex flex-col items-center justify-center relative z-10">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Request Submitted!</h4>
            <p className="text-white/60 mb-6 max-w-sm mx-auto">
              Thanks! An admin will review your study group request. Once approved, it will be automatically created and you will be added to it.
            </p>
            <button onClick={onClose} className="px-6 py-3 bg-white hover:bg-white/90 text-black font-bold rounded-xl w-full max-w-xs transition-all shadow-lg">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 relative z-10">
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">Group Name</label>
              <input
                type="text"
                required
                placeholder="e.g. May 2026 Biology Paper 1 Prep"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">Subject Category</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              >
                {subjects.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">Topic (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Paper 1, IA Review, Core Concepts"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">Description</label>
              <textarea
                required
                rows={2}
                placeholder="Briefly describe what this group is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none custom-scrollbar"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── New Discussion Modal ────────────────────────────────────────────────── */
function NewPostModal({ onClose, subjects }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || category === "All") { setErrorMsg("Please select a specific category."); return; }
    if (!title.trim()) { setErrorMsg("Please enter a title."); return; }
    if (!content.trim()) { setErrorMsg("Please enter content."); return; }

    setStatus("submitting");
    setErrorMsg("");

    try {
      await createPostAction({ title, content, category, postType });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="bg-[#121217] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-40 h-40 bg-green-500/20 blur-[50px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {postType === "question" ? "Question" : "Discussion"} Submitted
            </h3>
            <p className="text-sm font-medium text-muted/90 mb-8 leading-relaxed">
              Your {postType === "question" ? "question" : "discussion"} has been received and is <strong className="text-amber-400">pending admin approval</strong>. It will be publicly visible in the community once approved by a moderator.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-white hover:bg-white/90 text-black text-sm font-bold rounded-xl transition-all shadow-lg"
            >
              Back to Nexus Network
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121217] border border-white/10 rounded-3xl max-w-2xl w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-visible relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#121217]/90 backdrop-blur-md z-10 shrink-0 rounded-t-3xl">
          <h3 className="text-xl font-bold text-white">Create New Discussion</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Post Type */}
          <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex gap-2 w-fit">
            <button
              type="button"
              onClick={() => setPostType("discussion")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                postType === "discussion"
                  ? "bg-white/15 text-white shadow-sm border border-white/10"
                  : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <MessageCircle size={16} className={postType === "discussion" ? "text-indigo-400" : ""} /> Discussion
            </button>
            <button
              type="button"
              onClick={() => setPostType("question")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                postType === "question"
                  ? "bg-white/15 text-white shadow-sm border border-white/10"
                  : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <HelpCircle size={16} className={postType === "question" ? "text-emerald-400" : ""} /> Question
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="relative z-50">
            <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2 pl-1">
              Subject Category <span className="text-red-400">*</span>
            </label>
            <CustomSelect 
              value={category} 
              onChange={setCategory} 
              options={subjects}
              placeholder="Select a specific category..."
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2 pl-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-5 text-white/90 outline-none focus:border-indigo-500/50 focus:bg-white/5 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-muted/50 font-medium text-sm shadow-inner"
              placeholder={postType === "question" ? "What is your question?" : "Give your discussion a catchy title..."}
              maxLength={200}
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2 pl-1">
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-white/90 outline-none focus:border-indigo-500/50 focus:bg-white/5 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-muted/50 font-medium text-sm shadow-inner min-h-[200px] resize-y custom-scrollbar"
              placeholder="Share your thoughts, describe your problem in detail, or start a debate..."
              required
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="flex items-center gap-3 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl">
              <AlertCircle size={18} />
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px]"
            >
              {status === "submitting" ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send size={16} /> {postType === "question" ? "Post Question" : "Publish Discussion"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


