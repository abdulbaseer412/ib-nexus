"use client";

import { useState, useTransition } from "react";
import {
  ShieldAlert, Check, X, Search, Filter, AlertCircle,
  Clock, CheckCircle2, XCircle, Trash2, ChevronRight, User, Users, PenLine, BookOpen, Plus
} from "lucide-react";
import { 
  fetchPostsForModeration, 
  moderatePostAction, 
  deletePostAdmin,
  fetchStudyGroupsForModeration,
  moderateStudyGroupAction,
  updateStudyGroup,
  fetchStudyGroupMembersForModeration,
  removeStudyGroupMember,
  fetchFeedbacksForModeration,
  moderateFeedbackAction,
  deleteFeedbackAction
} from "../../community/actions";

export default function ModerationClient({ initialPending, initialPendingStudyGroups, initialPendingFeedbacks, counts, userId }) {
  const [reviewType, setReviewType] = useState("posts"); // "posts" | "study-groups" | "feedbacks"
  const [activeTab, setActiveTab] = useState("pending");
  const [posts, setPosts] = useState(initialPending);
  const [studyGroups, setStudyGroups] = useState(initialPendingStudyGroups || []);
  const [feedbacks, setFeedbacks] = useState(initialPendingFeedbacks || []);
  const [editingGroup, setEditingGroup] = useState(null);
  const [managingGroup, setManagingGroup] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleTypeChange = (type) => {
    setReviewType(type);
    setActiveTab("pending");
    startTransition(async () => {
      if (type === "posts") {
        const data = await fetchPostsForModeration("pending");
        setPosts(data);
      } else if (type === "study-groups") {
        const data = await fetchStudyGroupsForModeration("pending");
        setStudyGroups(data);
      } else if (type === "feedbacks") {
        const data = await fetchFeedbacksForModeration("pending");
        setFeedbacks(data);
      }
    });
  };

  const handleTabChange = (status) => {
    setActiveTab(status);
    startTransition(async () => {
      if (reviewType === "posts") {
        const data = await fetchPostsForModeration(status);
        setPosts(data);
      } else if (reviewType === "study-groups") {
        const data = await fetchStudyGroupsForModeration(status);
        setStudyGroups(data);
      } else if (reviewType === "feedbacks") {
        const data = await fetchFeedbacksForModeration(status === "approved" ? "resolved" : status);
        setFeedbacks(data);
      }
    });
  };

  const handleModerate = (postId, action) => {
    setPosts(current => current.filter(p => p.id !== postId));
    startTransition(async () => {
      try {
        await moderatePostAction(postId, action);
      } catch (err) {
        console.error(err);
        const data = await fetchPostsForModeration(activeTab);
        setPosts(data);
      }
    });
  };

  const handleDelete = (postId) => {
    if (!window.confirm("Are you sure you want to permanently delete this post?")) return;
    setPosts(current => current.filter(p => p.id !== postId));
    startTransition(async () => {
      try {
        await deletePostAdmin(postId);
      } catch (err) {
        console.error(err);
        const data = await fetchPostsForModeration(activeTab);
        setPosts(data);
      }
    });
  };

  const handleModerateStudyGroup = (groupId, action) => {
    setStudyGroups(current => current.filter(g => g.id !== groupId));
    startTransition(async () => {
      try {
        await moderateStudyGroupAction(groupId, action);
      } catch (err) {
        console.error(err);
        const data = await fetchStudyGroupsForModeration(activeTab);
        setStudyGroups(data);
      }
    });
  };

  const handleModerateFeedback = (feedbackId, action) => {
    setFeedbacks(current => current.filter(f => f.id !== feedbackId));
    startTransition(async () => {
      try {
        await moderateFeedbackAction(feedbackId, action);
      } catch (err) {
        console.error(err);
        const data = await fetchFeedbacksForModeration(activeTab === "approved" ? "resolved" : activeTab);
        setFeedbacks(data);
      }
    });
  };

  const handleDeleteFeedback = (feedbackId) => {
    if (!window.confirm("Are you sure you want to permanently delete this feedback?")) return;
    setFeedbacks(current => current.filter(f => f.id !== feedbackId));
    startTransition(async () => {
      try {
        await deleteFeedbackAction(feedbackId);
      } catch (err) {
        console.error(err);
        const data = await fetchFeedbacksForModeration(activeTab === "approved" ? "resolved" : activeTab);
        setFeedbacks(data);
      }
    });
  };

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--divider)] pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <ShieldAlert size={24} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Admin Moderation</h1>
              <p className="mt-1 text-sm text-muted">Review community submissions before they go public.</p>
            </div>
          </div>
          
          <div className="flex gap-2 p-1 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
            <button 
              onClick={() => handleTypeChange("posts")} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${reviewType === "posts" ? "bg-[var(--surface)] text-white shadow-sm" : "text-muted hover:text-secondary"}`}
            >
              Discussions
            </button>
            <button 
              onClick={() => handleTypeChange("study-groups")} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${reviewType === "study-groups" ? "bg-[var(--surface)] text-white shadow-sm" : "text-muted hover:text-secondary"}`}
            >
              Study Groups
            </button>
            <button 
              onClick={() => handleTypeChange("feedbacks")} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${reviewType === "feedbacks" ? "bg-[var(--surface)] text-white shadow-sm" : "text-muted hover:text-secondary"}`}
            >
              Feedback & Support
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Navigation Sidebar */}
          <aside className="lg:w-64 shrink-0 space-y-1">
            <button
              onClick={() => handleTabChange("pending")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                activeTab === "pending" ? "bg-amber-500/10 text-amber-500 font-medium" : "text-muted hover:bg-[var(--surface)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <Clock size={16} /> Pending Review
              </span>
              {reviewType === "posts" && counts.pending > 0 && activeTab !== "pending" && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {counts.pending}
                </span>
              )}
              {reviewType === "study-groups" && counts.pendingStudyGroups > 0 && activeTab !== "pending" && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {counts.pendingStudyGroups}
                </span>
              )}
              {reviewType === "feedbacks" && counts.pendingFeedbacks > 0 && activeTab !== "pending" && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {counts.pendingFeedbacks}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange("approved")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === "approved" ? "bg-green-500/10 text-green-500 font-medium" : "text-muted hover:bg-[var(--surface)]"
              }`}
            >
              <CheckCircle2 size={16} /> {reviewType === "feedbacks" ? "Resolved Content" : "Approved Content"}
            </button>
            
            {reviewType === "posts" && (
              <button
                onClick={() => handleTabChange("rejected")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  activeTab === "rejected" ? "bg-danger/10 text-danger font-medium" : "text-muted hover:bg-[var(--surface)]"
                }`}
              >
                <XCircle size={16} /> Rejected Content
              </button>
            )}

            <hr className="my-4 border-[var(--divider)]" />
            <button
              disabled
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-muted opacity-50 cursor-not-allowed"
            >
              <span className="flex items-center gap-3">
                <AlertCircle size={16} /> Reported Content
              </span>
            </button>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-4">
            
            {/* Loading State */}
            {isPending && (
              <div className="text-center py-8 text-sm text-muted animate-pulse">Loading...</div>
            )}

            {/* Empty State */}
            {!isPending && ((reviewType === "posts" && posts.length === 0) || (reviewType === "study-groups" && studyGroups.length === 0) || (reviewType === "feedbacks" && feedbacks.length === 0)) && (
              <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--card)]">
                <ShieldAlert size={32} className="text-muted mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-secondary">Queue is empty</h3>
                <p className="mt-2 text-sm text-muted">No {activeTab} {reviewType === "posts" ? "posts" : reviewType === "study-groups" ? "study groups" : "feedbacks"} to display right now.</p>
              </div>
            )}

            {/* Feedback Cards */}
            {!isPending && reviewType === "feedbacks" && feedbacks.map(feedback => (
              <div key={feedback.id} className="card p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--divider)] transition">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg text-primary">{feedback.name} <span className="text-sm font-normal text-muted">({feedback.email})</span></h3>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-semibold">
                      {feedback.category}
                    </div>
                    <p className="mt-4 text-sm text-secondary whitespace-pre-wrap">{feedback.message}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted font-medium">
                      <span className="flex items-center gap-1"><Clock size={14} /> {new Date(feedback.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {activeTab === "pending" && (
                      <button 
                        onClick={() => handleModerateFeedback(feedback.id, "resolved")}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 font-semibold transition text-sm"
                        disabled={isPending}
                      >
                        <Check size={16} /> Resolve
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteFeedback(feedback.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger font-semibold transition text-sm"
                      disabled={isPending}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Post Cards */}
            {!isPending && reviewType === "posts" && posts.map(post => (
              <article
                key={post.id}
                className={`card p-5 border-l-4 ${
                  post.status === "pending" ? "border-l-amber-500" :
                  post.status === "approved" ? "border-l-green-500" :
                  "border-l-danger"
                }`}
              >
                <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="bg-[var(--surface-alt)] px-2 py-1 rounded-md text-secondary font-medium">
                        {post.category}
                      </span>
                      <span className="text-muted flex items-center gap-1">
                        <User size={12} /> {post.author_name}
                      </span>
                      <span className="text-muted flex items-center gap-1">
                        <Clock size={12} /> {new Date(post.created_at).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold">{post.title}</h2>
                  </div>

                  {activeTab === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleModerate(post.id, "approved")}
                        className="btn bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white px-3 py-1.5"
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button
                        onClick={() => handleModerate(post.id, "rejected")}
                        className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white px-3 py-1.5"
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  )}

                  {activeTab === "approved" && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white px-3 py-1.5 shrink-0"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                  
                  {activeTab === "rejected" && (
                    <button
                      onClick={() => handleModerate(post.id, "approved")}
                      className="btn bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white px-3 py-1.5 shrink-0"
                    >
                      <Check size={16} /> Restore & Approve
                    </button>
                  )}
                </header>

                <div className="text-sm text-secondary bg-[var(--surface)] p-4 rounded-xl border border-[var(--divider)] whitespace-pre-wrap">
                  {post.content}
                </div>
              </article>
            ))}

            {/* Subject Request Cards */}
            {!isPending && reviewType === "study-groups" && studyGroups.filter(g => g.name.startsWith("SUBJECT REQUEST:")).map(group => (
              <article
                key={group.id}
                className={`card p-5 border-l-4 ${
                  !group.is_active ? "border-l-purple-500" : "border-l-green-500"
                }`}
              >
                <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                        <BookOpen size={12} /> Subject Request
                      </span>
                      <span className="text-muted flex items-center gap-1">
                        <Clock size={12} /> {new Date(group.created_at).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold">{group.name.replace("SUBJECT REQUEST: ", "")}</h2>
                  </div>

                  {activeTab === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="btn bg-white/10 text-white hover:bg-white/20 px-3 py-1.5"
                      >
                        <PenLine size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleModerateStudyGroup(group.id, "approve")}
                        className="btn bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white px-3 py-1.5"
                      >
                        <Check size={16} /> Mark Added / Approve
                      </button>
                      <button
                        onClick={() => handleModerateStudyGroup(group.id, "reject")}
                        className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white px-3 py-1.5"
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  )}

                  {activeTab === "approved" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleModerateStudyGroup(group.id, "reject")}
                        className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white px-3 py-1.5 shrink-0"
                      >
                        <Trash2 size={16} /> Delete Record
                      </button>
                    </div>
                  )}
                </header>
                {group.description && (
                  <div className="text-sm text-secondary bg-[var(--surface)] p-4 rounded-xl border border-[var(--divider)] whitespace-pre-wrap">
                    {group.description}
                  </div>
                )}
              </article>
            ))}

            {/* Study Group Cards */}
            {!isPending && reviewType === "study-groups" && studyGroups.filter(g => !g.name.startsWith("SUBJECT REQUEST:")).map(group => (
              <article
                key={group.id}
                className={`card p-5 border-l-4 ${
                  !group.is_active ? "border-l-amber-500" : "border-l-green-500"
                }`}
              >
                <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="bg-[var(--surface-alt)] px-2 py-1 rounded-md text-secondary font-medium uppercase tracking-wider">
                        {group.subject}
                      </span>
                      <span className="text-muted flex items-center gap-1">
                        <Clock size={12} /> {new Date(group.created_at).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold">{group.name}</h2>
                    {group.topic && <p className="text-sm font-medium text-indigo-400 mt-1">Topic: {group.topic}</p>}
                  </div>

                  {activeTab === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="btn bg-white/10 text-white hover:bg-white/20 px-3 py-1.5"
                      >
                        <PenLine size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleModerateStudyGroup(group.id, "approve")}
                        className="btn bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white px-3 py-1.5"
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button
                        onClick={() => handleModerateStudyGroup(group.id, "reject")}
                        className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white px-3 py-1.5"
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  )}

                  {activeTab === "approved" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setManagingGroup(group.id)}
                        className="btn bg-white/10 text-white hover:bg-white/20 px-3 py-1.5"
                      >
                        <Users size={16} /> Manage Members
                      </button>
                      <button
                        onClick={() => handleModerateStudyGroup(group.id, "reject")}
                        className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white px-3 py-1.5 shrink-0"
                      >
                        <Trash2 size={16} /> Delete Group
                      </button>
                    </div>
                  )}
                </header>
                {group.description && (
                  <div className="text-sm text-secondary bg-[var(--surface)] p-4 rounded-xl border border-[var(--divider)] whitespace-pre-wrap">
                    {group.description}
                  </div>
                )}
              </article>
            ))}

          </div>
        </div>
      </div>
      
      {editingGroup && (
        <EditStudyGroupModal 
          group={editingGroup} 
          onClose={() => setEditingGroup(null)}
          onSaved={async () => {
            const data = await fetchStudyGroupsForModeration(activeTab);
            setStudyGroups(data);
            setEditingGroup(null);
          }}
        />
      )}

      {managingGroup && (
        <ManageMembersModal
          groupId={managingGroup}
          onClose={() => setManagingGroup(null)}
        />
      )}
    </main>
  );
}

function EditStudyGroupModal({ group, onClose, onSaved }) {
  const [name, setName] = useState(group.name);
  const [subject, setSubject] = useState(group.subject);
  const [topic, setTopic] = useState(group.topic || "");
  const [description, setDescription] = useState(group.description || "");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateStudyGroup(group.id, { name, subject, topic, description });
        onSaved();
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--divider)] rounded-3xl p-6 shadow-2xl">
        <h3 className="text-xl font-bold mb-4">Edit Study Group</h3>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Subject</label>
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Topic (Optional)</label>
            <input 
              type="text" 
              value={topic} 
              onChange={e => setTopic(e.target.value)} 
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Description (Optional)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="input w-full min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn bg-[var(--surface-alt)] hover:bg-white/10" disabled={isPending}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";

function ManageMembersModal({ groupId, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRemoving, startTransition] = useTransition();

  useEffect(() => {
    fetchStudyGroupMembersForModeration(groupId).then(data => {
      setMembers(data);
      setLoading(false);
    });
  }, [groupId]);

  const handleRemove = (userId) => {
    startTransition(async () => {
      await removeStudyGroupMember(groupId, userId);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--divider)] rounded-3xl p-6 shadow-2xl">
        <h3 className="text-xl font-bold mb-4">Manage Members</h3>
        
        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted">No members found.</p>
          ) : (
            members.map(m => (
              <div key={m.user_id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-alt)]">
                <div className="flex items-center gap-3">
                  <img src={m.profiles.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} alt="Avatar" className="w-8 h-8 rounded-full" />
                  <span className="text-sm font-medium">{m.profiles.display_name || "Anonymous"}</span>
                </div>
                <button 
                  onClick={() => handleRemove(m.user_id)}
                  disabled={isRemoving}
                  className="p-1.5 text-danger hover:bg-danger/10 rounded-md transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn bg-[var(--surface-alt)] hover:bg-white/10 w-full font-bold">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
