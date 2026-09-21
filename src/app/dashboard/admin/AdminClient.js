"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase-browser";
import {
  ShieldAlert, Users, MessageSquare, Radio, History,
  Search, Filter, Plus, Trash2, Edit3, UserX, UserCheck, CheckCircle2,
  AlertTriangle, RefreshCw, X, MessageCircle, ShieldCheck,
  Eye, Check, Shield, Layers, HelpCircle, Users2, Flag, FileText, ArrowRight, CornerDownRight, XCircle,
  Megaphone, ExternalLink, Send, Sparkles, BookOpen, Lock, Unlock, Globe, Power, Clock, Save,
  Cpu, Pause, Play, EyeOff, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  suspendUserAction,
  restoreUserAction,
  fetchUserDetailStats,
  fetchAdminCommunityItems,
  updateCommunityContentAction,
  approvePostAction,
  rejectPostAction,
  approveStudyGroupAction,
  rejectStudyGroupAction,
  dismissReportAction,
  deleteDiscussionAction,
  deleteReplyAction,
  createLiveRoomAction,
  updateLiveRoomAction,
  deleteLiveRoomAction,
  fetchRoomMessagesForModeration,
  sendModeratorChatMessageAction,
  updateRoomStatusAction,
  deleteChatMessageAction,
  fetchAdminOverviewStats,
  fetchAdminUsers,
  fetchAdminRooms,
  fetchAdminActivityLogs,
  deleteSingleAuditLogAction,
  clearAllAuditLogsAction,
  fetchWebsiteLockSettingsAction,
  updateWebsiteLockStatusAction,
  addKnowledgeItemAction,
  editKnowledgeItemAction,
  fetchAdminModelConfigsAction,
  updateModelMetadataAction,
  setAdminDefaultModelAction,
  toggleModelPauseAction,
  toggleModelHideAction,
  toggleModelEnableAction,
  addGoogleAccountToAllowlist,
  removeGoogleAccountFromAllowlist,
} from "./actions";
import AiCoreTab from "./AiCoreTab";
import {
  bootstrapSubjectsDB,
  addGlobalSubjectAction,
  editGlobalSubjectAction,
  deleteGlobalSubjectAction,
  fetchGlobalSubjects,
} from "../subjects/actions";

function renderStatCount(metric, isRefreshing) {
  if (isRefreshing) {
    return <span className="animate-pulse text-white/40">—</span>;
  }
  if (typeof metric === "number") {
    return metric;
  }
  if (!metric) {
    return <span className="animate-pulse text-white/40">—</span>;
  }
  if (metric.status === "error" || metric.count === null || metric.count === undefined) {
    return <span className="text-xs text-rose-400 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> Unable to load</span>;
  }
  return metric.count;
}

function getMetricNumber(metric, fallback = 0) {
  if (typeof metric === "number") return metric;
  if (metric && metric.status === "success" && typeof metric.count === "number") return metric.count;
  return fallback;
}

export default function AdminClient({
  adminUser,
  adminProfile,
  initialStats,
  initialUsers,
  initialCommunityItems,
  initialRooms,
  initialLogs,
  initialSubjects = [],
  initialWebsiteSettings = { is_locked: false, lock_message: "" },
  initialModelConfigs = [],
  initialWebsiteAllowlist = [],
  initialCoreVersions = [],
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview"); // overview, users, community, rooms, courses, models, website, logs
  const [websiteLockSettings, setWebsiteLockSettings] = useState(initialWebsiteSettings || { is_locked: false, lock_message: "" });
  const [lockMessageInput, setLockMessageInput] = useState(initialWebsiteSettings?.lock_message || "");
  const [isUpdatingLock, setIsUpdatingLock] = useState(false);
  const [websiteLockConfirmModal, setWebsiteLockConfirmModal] = useState(null); // null | 'lock' | 'unlock'
  const [isPending, startTransition] = useTransition();
  const [refreshState, setRefreshState] = useState("idle"); // idle | refreshing | success

  // Allowlist States
  const [allowlist, setAllowlist] = useState(initialWebsiteAllowlist || []);
  const [newAllowlistEmail, setNewAllowlistEmail] = useState("");
  const [isAddingAllowlist, setIsAddingAllowlist] = useState(false);
  const [removingAllowlistId, setRemovingAllowlistId] = useState(null);

  // Primary Data States
  const [stats, setStats] = useState(initialStats);
  const [users, setUsers] = useState(initialUsers);
  const [communityItems, setCommunityItems] = useState(initialCommunityItems);
  const [rooms, setRooms] = useState(initialRooms);
  const [logs, setLogs] = useState(initialLogs);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [modelConfigs, setModelConfigs] = useState(initialModelConfigs || []);

  // AI Models Control State
  const [editingModelModal, setEditingModelModal] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAllowedRoles, setEditAllowedRoles] = useState("all");
  const [editMaxTokens, setEditMaxTokens] = useState(2048);
  const [editTemperature, setEditTemperature] = useState(0.7);
  const [editFallbackModelId, setEditFallbackModelId] = useState("gemini-3.6-flash");
  const [isSubmittingModelEdit, setIsSubmittingModelEdit] = useState(false);
  const [modelProviderFilter, setModelProviderFilter] = useState("all");
  const [modelStatusFilter, setModelStatusFilter] = useState("all");

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityContentType, setCommunityContentType] = useState("all"); // all, discussion, question, study_group, report
  const [communityCategory, setCommunityCategory] = useState("all");
  const [communityStatusFilter, setCommunityStatusFilter] = useState("all"); // all, pending, approved, rejected

  const [logSearch, setLogSearch] = useState("");
  const [logCategoryFilter, setLogCategoryFilter] = useState("all");

  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectProgramFilter, setSubjectProgramFilter] = useState("all"); // 'all' | 'dp' | 'myp'
  const [subjectModal, setSubjectModal] = useState(null); // { mode: 'create' | 'edit', subject?: {} }
  const [isSeedingSubjects, setIsSeedingSubjects] = useState(false);

  // Notifications
  const [toast, setToast] = useState(null);
  const showToast = (text, type = "success") => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Modals & Drawers
  const [confirmModal, setConfirmModal] = useState(null);
  const [roomModal, setRoomModal] = useState(null); // { mode: 'create'|'edit', room?: {} }
  const [chatDrawer, setChatDrawer] = useState(null); // { room, messages: [] }
  const [userDrawer, setUserDrawer] = useState(null); // { profile, userStats }
  const [itemDrawer, setItemDrawer] = useState(null); // { item, isEditing: false }
  const [logDetailModal, setLogDetailModal] = useState(null);
  const [confirmDeleteLogModal, setConfirmDeleteLogModal] = useState(null);
  const [confirmClearLogsModal, setConfirmClearLogsModal] = useState(false);

  // Live Chat Moderation Input & Filter States
  const [adminChatMessage, setAdminChatMessage] = useState("");
  const [adminChatIsNotice, setAdminChatIsNotice] = useState(false);
  const [adminChatSending, setAdminChatSending] = useState(false);
  const [chatDrawerFilter, setChatDrawerFilter] = useState("all");

  const [aiKnowledgeModal, setAiKnowledgeModal] = useState(null); // { mode: 'create' | 'edit', item?: {} }

  // Realtime subscription for chat moderation drawer
  useEffect(() => {
    if (!chatDrawer?.room?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-room-chat-${chatDrawer.room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
          filter: `room_id=eq.${chatDrawer.room.id}`
        },
        async () => {
          const res = await fetchRoomMessagesForModeration(chatDrawer.room.id);
          if (res.success) {
            setChatDrawer(prev => prev ? { ...prev, messages: res.messages } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatDrawer?.room?.id]);

  // Refresh All Data with Visual Feedback
  const handleRefresh = async () => {
    setRefreshState("refreshing");
    startTransition(async () => {
      try {
        router.refresh();
        const [sRes, uRes, cRes, rRes, lRes] = await Promise.all([
          fetchAdminOverviewStats(),
          fetchAdminUsers({ search: userSearch, statusFilter: userStatusFilter }),
          fetchAdminCommunityItems({ search: communitySearch, contentType: communityContentType, category: communityCategory, statusFilter: communityStatusFilter }),
          fetchAdminRooms(),
          fetchAdminActivityLogs({ search: logSearch, categoryFilter: logCategoryFilter }),
        ]);

        if (sRes.stats) setStats(sRes.stats);
        if (uRes.users) setUsers(uRes.users);
        if (cRes.items) setCommunityItems(cRes.items);
        if (rRes.rooms) setRooms(rRes.rooms);
        if (lRes.logs) setLogs(lRes.logs);

        setRefreshState("success");
        showToast("All administrative data refreshed successfully", "success");
        setTimeout(() => setRefreshState("idle"), 2500);
      } catch (err) {
        setRefreshState("idle");
        showToast("Failed to refresh data: " + err.message, "error");
      }
    });
  };

  // User Actions
  const handleInspectUser = async (u) => {
    startTransition(async () => {
      const res = await fetchUserDetailStats(u.id);
      if (res.success) {
        setUserDrawer({ profile: res.profile, userStats: res.userStats });
      } else {
        setUserDrawer({ profile: u, userStats: { postCount: 0, replyCount: 0, studyGroupCount: 0 } });
      }
    });
  };

  const handleSuspendUser = (targetUser) => {
    setConfirmModal({
      title: `Suspend Account "${targetUser.display_name || targetUser.email}"?`,
      message: "They will be immediately blocked from accessing protected application functionality on IB Nexus.",
      dangerText: "Suspend Account",
      actionFn: async () => {
        const res = await suspendUserAction(targetUser.id);
        if (res.success) {
          showToast(res.message, "success");
          setUsers(users.map(u => u.id === targetUser.id ? { ...u, is_restricted: true, is_suspended: true } : u));
          if (userDrawer && userDrawer.profile.id === targetUser.id) {
            setUserDrawer(prev => ({ ...prev, profile: { ...prev.profile, is_restricted: true, is_suspended: true } }));
          }
          fetchAdminOverviewStats().then(sRes => sRes.stats && setStats(sRes.stats));
        } else {
          showToast(res.error, "error");
        }
      }
    });
  };

  const handleRestoreUser = (targetUser) => {
    setConfirmModal({
      title: `Restore Access "${targetUser.display_name || targetUser.email}"?`,
      message: "The user will regain standard application access to IB Nexus.",
      dangerText: "Restore Access",
      actionFn: async () => {
        const res = await restoreUserAction(targetUser.id);
        if (res.success) {
          showToast(res.message, "success");
          setUsers(users.map(u => u.id === targetUser.id ? { ...u, is_restricted: false, is_suspended: false } : u));
          if (userDrawer && userDrawer.profile.id === targetUser.id) {
            setUserDrawer(prev => ({ ...prev, profile: { ...prev.profile, is_restricted: false, is_suspended: false } }));
          }
          fetchAdminOverviewStats().then(sRes => sRes.stats && setStats(sRes.stats));
        } else {
          showToast(res.error, "error");
        }
      }
    });
  };

  // Community Moderation Actions
  const handleSearchCommunity = async (e, overrideType = null, overrideStatus = null) => {
    e?.preventDefault();
    const typeToFetch = overrideType !== null ? overrideType : communityContentType;
    const statusToFetch = overrideStatus !== null ? overrideStatus : communityStatusFilter;

    startTransition(async () => {
      const res = await fetchAdminCommunityItems({
        search: communitySearch,
        contentType: typeToFetch,
        category: communityCategory,
        statusFilter: statusToFetch,
        limit: 100,
      });
      if (res.items) setCommunityItems(res.items);
    });
  };

  const handleInspectItem = (item) => {
    setItemDrawer({ item, isEditing: false });
  };

  const handleApprovePost = (postId) => {
    startTransition(async () => {
      const res = await approvePostAction(postId);
      if (res.success) {
        showToast(res.message, "success");
        setCommunityItems(prev => prev.map(i => i.id === postId ? { ...i, status: "approved" } : i));
        if (itemDrawer && itemDrawer.item.id === postId) {
          setItemDrawer(prev => ({ ...prev, item: { ...prev.item, status: "approved" } }));
        }
        fetchAdminOverviewStats().then(sRes => sRes.stats && setStats(sRes.stats));
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleRejectPost = (postId) => {
    startTransition(async () => {
      const res = await rejectPostAction(postId);
      if (res.success) {
        showToast(res.message, "success");
        setCommunityItems(prev => prev.map(i => i.id === postId ? { ...i, status: "rejected" } : i));
        if (itemDrawer && itemDrawer.item.id === postId) {
          setItemDrawer(prev => ({ ...prev, item: { ...prev.item, status: "rejected" } }));
        }
        fetchAdminOverviewStats().then(sRes => sRes.stats && setStats(sRes.stats));
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleSaveItemEdit = async (item, formData) => {
    const title = formData.get("title");
    const content = formData.get("content");
    const category = formData.get("category");
    const description = formData.get("description");
    const status = formData.get("status");

    startTransition(async () => {
      const res = await updateCommunityContentAction({
        contentType: item.contentType,
        id: item.id,
        title,
        content,
        category,
        description,
        status,
      });

      if (res.success) {
        showToast(res.message, "success");
        setItemDrawer(null);
        handleSearchCommunity();
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleApproveStudyGroup = (groupId) => {
    startTransition(async () => {
      const res = await approveStudyGroupAction(groupId);
      if (res.success) {
        showToast(res.message, "success");
        setCommunityItems(communityItems.map(i => i.id === groupId ? { ...i, status: "active" } : i));
        if (itemDrawer && itemDrawer.item.id === groupId) setItemDrawer(null);
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleRejectStudyGroup = (groupId) => {
    startTransition(async () => {
      const res = await rejectStudyGroupAction(groupId);
      if (res.success) {
        showToast(res.message, "success");
        setCommunityItems(communityItems.map(i => i.id === groupId ? { ...i, status: "pending" } : i));
        if (itemDrawer && itemDrawer.item.id === groupId) setItemDrawer(null);
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleDismissReport = (reportId) => {
    startTransition(async () => {
      const res = await dismissReportAction(reportId);
      if (res.success) {
        showToast(res.message, "success");
        setCommunityItems(communityItems.filter(i => i.id !== reportId));
        if (itemDrawer && itemDrawer.item.id === reportId) setItemDrawer(null);
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleDeleteCommunityItem = (item) => {
    setConfirmModal({
      title: `Delete ${item.contentType.toUpperCase()} "${item.title}"?`,
      message: "This item will be permanently removed from the database.",
      dangerText: "Delete Content",
      actionFn: async () => {
        let res;
        if (item.contentType === "reply") {
          res = await deleteReplyAction(item.id);
        } else {
          res = await deleteDiscussionAction(item.id);
        }

        if (res.success) {
          showToast(res.message, "success");
          setCommunityItems(communityItems.filter(i => i.id !== item.id));
          if (itemDrawer && itemDrawer.item.id === item.id) setItemDrawer(null);
        } else {
          showToast(res.error, "error");
        }
      }
    });
  };

  // Live Room Actions
  const handleDeleteRoom = (room) => {
    setConfirmModal({
      title: `Delete Live Room "${room.name}"?`,
      message: "This room and its chat stream will be permanently deleted.",
      dangerText: "Delete Room",
      actionFn: async () => {
        const res = await deleteLiveRoomAction(room.id);
        if (res.success) {
          showToast(res.message, "success");
          setRooms(rooms.filter(r => r.id !== room.id));
        } else {
          showToast(res.error, "error");
        }
      }
    });
  };

  const [chatDrawerSearch, setChatDrawerSearch] = useState("");
  const [chatDrawerActiveTab, setChatDrawerActiveTab] = useState("messages"); // "messages" | "participants" | "details"

  const handleOpenChatDrawer = async (room) => {
    startTransition(async () => {
      const res = await fetchRoomMessagesForModeration(room.id);
      setChatDrawer({
        room: res.room || room,
        messages: res.messages || [],
        participants: res.participants || [],
        totalMessagesCount: res.totalMessagesCount || 0,
        isEditingRoom: false
      });
      setChatDrawerSearch("");
      setChatDrawerActiveTab("messages");
    });
  };

  const handleUpdateRoomStatus = async (newStatus) => {
    if (!chatDrawer?.room?.id) return;
    startTransition(async () => {
      const res = await updateRoomStatusAction({ roomId: chatDrawer.room.id, status: newStatus });
      if (res.success) {
        showToast(`Room status updated to ${newStatus}`, "success");
        setChatDrawer(prev => prev ? { ...prev, room: res.room } : null);
        setRooms(prev => prev.map(r => r.id === chatDrawer.room.id ? { ...r, is_active: res.room.is_active } : r));
      } else {
        showToast(res.error || "Failed to update room status", "error");
      }
    });
  };

  const handleDeleteChatMessage = (messageId) => {
    setConfirmModal({
      title: "Delete Chat Message?",
      message: "This message will be removed from the live room and database.",
      dangerText: "Delete Message",
      actionFn: async () => {
        const res = await deleteChatMessageAction(messageId);
        if (res.success) {
          showToast(res.message, "success");
          if (chatDrawer) {
            setChatDrawer(prev => ({
              ...prev,
              messages: prev.messages.filter(m => m.id !== messageId)
            }));
          }
        } else {
          showToast(res.error, "error");
        }
      }
    });
  };

  const handleSendAdminChatMessage = async (e) => {
    e?.preventDefault();
    if (!chatDrawer?.room?.id || !adminChatMessage.trim() || adminChatSending) return;

    setAdminChatSending(true);
    try {
      const res = await sendModeratorChatMessageAction({
        roomId: chatDrawer.room.id,
        content: adminChatMessage,
        isNotice: adminChatIsNotice
      });

      if (res.success) {
        setAdminChatMessage("");
        showToast(adminChatIsNotice ? "Official Notice posted to live room." : "Moderator message sent.", "success");
        const refreshed = await fetchRoomMessagesForModeration(chatDrawer.room.id);
        if (refreshed.success) {
          setChatDrawer(prev => prev ? { ...prev, messages: refreshed.messages } : null);
        }
      } else {
        showToast(res.error || "Failed to post moderator message.", "error");
      }
    } catch (err) {
      showToast(err.message || "Error posting message.", "error");
    } finally {
      setAdminChatSending(false);
    }
  };

  // Activity Log Search
  const handleSearchLogs = async (e) => {
    e?.preventDefault();
    startTransition(async () => {
      const res = await fetchAdminActivityLogs({ search: logSearch, categoryFilter: logCategoryFilter });
      if (res.logs) setLogs(res.logs);
    });
  };

  // Delete single audit log entry
  const handleDeleteSingleLog = async (logId) => {
    startTransition(async () => {
      const res = await deleteSingleAuditLogAction(logId);
      if (res.success) {
        setLogs(prev => prev.filter(l => l.id !== logId));
        showToast(res.message, "success");
        setConfirmDeleteLogModal(null);
        if (logDetailModal?.id === logId) setLogDetailModal(null);
      } else {
        showToast(res.error || "Failed to delete log entry.", "error");
      }
    });
  };

  // Clear all audit logs
  const handleClearAllLogs = async () => {
    startTransition(async () => {
      const res = await clearAllAuditLogsAction();
      if (res.success) {
        setLogs([]);
        showToast(res.message, "success");
        setConfirmClearLogsModal(false);
        setLogDetailModal(null);
      } else {
        showToast(res.error || "Failed to clear audit logs.", "error");
      }
    });
  };

  const handleSeedCatalog = async () => {
    if (!confirm("This will seed/sync the official MYP 5 and DP 2 subject catalog into the database. Continue?")) return;
    setIsSeedingSubjects(true);
    try {
      const res = await bootstrapSubjectsDB();
      if (res.success) {
        const fresh = await fetchGlobalSubjects();
        setSubjects(fresh);
        showToast("Official DP 2 & MYP 5 Subject Catalogs seeded successfully!", "success");
      } else {
        showToast("Error seeding catalog: " + (res.error || "Unknown error"), "error");
      }
    } catch (err) {
      showToast(err.message || "Error seeding catalog", "error");
    } finally {
      setIsSeedingSubjects(false);
    }
  };

  const handleSaveSubjectSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const program = formData.get("program");
    const category = formData.get("category");
    const name = formData.get("name");
    const sl = formData.get("level_sl") === "on";
    const hl = formData.get("level_hl") === "on";

    let available_levels = null;
    if (program === "dp") {
      if (sl && hl) available_levels = JSON.stringify(["SL", "HL"]);
      else if (sl) available_levels = JSON.stringify(["SL"]);
      else if (hl) available_levels = JSON.stringify(["HL"]);
    }

    startTransition(async () => {
      try {
        if (subjectModal.mode === "create") {
          await addGlobalSubjectAction(program, category, name, available_levels);
          showToast(`Added ${name} to ${program.toUpperCase()} catalog`, "success");
        } else {
          await editGlobalSubjectAction(subjectModal.subject.id, program, category, name, available_levels);
          showToast(`Updated ${name}`, "success");
        }
        setSubjectModal(null);
        const fresh = await fetchGlobalSubjects();
        setSubjects(fresh);
      } catch (err) {
        showToast(err.message || "Failed to save subject", "error");
      }
    });
  };

  const handleDeleteSubjectClick = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the subject catalog?`)) return;
    startTransition(async () => {
      try {
        await deleteGlobalSubjectAction(id);
        setSubjects(prev => prev.filter(s => s.id !== id));
        showToast(`Deleted ${name} from course catalog`, "success");
      } catch (err) {
        showToast(err.message || "Failed to delete subject", "error");
      }
    });
  };

  const pendingCommunityCount = communityItems.filter(i => i.status === "pending").length;
  const pendingTotal = getMetricNumber(stats?.pendingApprovalTotal, pendingCommunityCount);

  const handleToggleWebsiteLock = async (targetLockedState) => {
    setIsUpdatingLock(true);
    setWebsiteLockConfirmModal(null);
    startTransition(async () => {
      const res = await updateWebsiteLockStatusAction({
        isLocked: targetLockedState,
        lockMessage: lockMessageInput,
      });
      setIsUpdatingLock(false);
      if (res.success) {
        setWebsiteLockSettings(res.settings);
        showToast(res.message, "success");
      } else {
        showToast(res.error || "Failed to update website status", "error");
      }
    });
  };

  const handleSaveLockMessage = async () => {
    setIsUpdatingLock(true);
    startTransition(async () => {
      const res = await updateWebsiteLockStatusAction({
        isLocked: websiteLockSettings.is_locked,
        lockMessage: lockMessageInput,
      });
      setIsUpdatingLock(false);
      if (res.success) {
        setWebsiteLockSettings(res.settings);
        showToast("Website lock notice saved successfully.", "success");
      } else {
        showToast(res.error || "Failed to save lock notice", "error");
      }
    });
  };

  // AI Model Control Handlers
  const handleSetDefaultModel = async (modelId) => {
    startTransition(async () => {
      const res = await setAdminDefaultModelAction(modelId);
      if (res.success) {
        showToast(res.message, "success");
        setModelConfigs(prev =>
          prev.map(m => ({ ...m, is_default: m.model_id === modelId }))
        );
      } else {
        showToast(res.error || "Failed to set default model", "error");
      }
    });
  };

  const handleTogglePauseModel = async (modelId, currentPaused) => {
    startTransition(async () => {
      const res = await toggleModelPauseAction(modelId, !currentPaused);
      if (res.success) {
        showToast(res.message, "success");
        setModelConfigs(prev =>
          prev.map(m => (m.model_id === modelId ? { ...m, is_paused: !currentPaused } : m))
        );
      } else {
        showToast(res.error || "Failed to toggle pause state", "error");
      }
    });
  };

  const handleToggleHideModel = async (modelId, currentHidden) => {
    startTransition(async () => {
      const res = await toggleModelHideAction(modelId, !currentHidden);
      if (res.success) {
        showToast(res.message, "success");
        setModelConfigs(prev =>
          prev.map(m => (m.model_id === modelId ? { ...m, is_hidden: !currentHidden } : m))
        );
      } else {
        showToast(res.error || "Failed to toggle visibility state", "error");
      }
    });
  };

  const handleToggleEnableModel = async (modelId, currentEnabled) => {
    startTransition(async () => {
      const res = await toggleModelEnableAction(modelId, !currentEnabled);
      if (res.success) {
        showToast(res.message, "success");
        setModelConfigs(prev =>
          prev.map(m => (m.model_id === modelId ? { ...m, enabled: !currentEnabled } : m))
        );
      } else {
        showToast(res.error || "Failed to toggle enabled state", "error");
      }
    });
  };

  const handleOpenEditModelModal = (model) => {
    setEditingModelModal(model);
    setEditDisplayName(model.display_name || model.displayName || "");
    setEditDescription(model.description || "");
    setEditAllowedRoles(model.allowed_roles || model.allowedRoles || "all");
    setEditMaxTokens(model.max_tokens || model.maxTokens || 2048);
    setEditTemperature(model.temperature !== undefined && model.temperature !== null ? model.temperature : 0.7);
    setEditFallbackModelId(model.fallback_model_id || model.fallbackModelId || "gemini-3.6-flash");
  };

  const handleSaveModelMetadata = async (e) => {
    e.preventDefault();
    if (!editingModelModal) return;
    setIsSubmittingModelEdit(true);

    try {
      const targetModelId = editingModelModal.model_id || editingModelModal.id;
      const res = await updateModelMetadataAction({
        modelId: targetModelId,
        displayName: editDisplayName,
        description: editDescription,
        allowedRoles: editAllowedRoles,
        maxTokens: editMaxTokens,
        temperature: editTemperature,
        fallbackModelId: editFallbackModelId,
      });

      if (res.success) {
        showToast("Model configuration updated successfully", "success");
        setModelConfigs(prev =>
          prev.map(m =>
            (m.model_id || m.id) === targetModelId
              ? {
                  ...m,
                  display_name: editDisplayName,
                  description: editDescription,
                  allowed_roles: editAllowedRoles,
                  allowedRoles: editAllowedRoles,
                  max_tokens: editMaxTokens,
                  maxTokens: editMaxTokens,
                  temperature: editTemperature,
                  fallback_model_id: editFallbackModelId,
                  fallbackModelId: editFallbackModelId,
                }
              : m
          )
        );
        setEditingModelModal(null);
      } else {
        showToast(res.error || "Failed to update model details", "error");
      }
    } catch (err) {
      showToast(err.message || "Failed to save model metadata", "error");
    } finally {
      setIsSubmittingModelEdit(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: ShieldAlert },
    { id: "users", label: "Users", icon: Users, badge: getMetricNumber(stats?.totalUsers, users.length) },
    { id: "community", label: "Community Moderation", icon: MessageSquare, badge: pendingTotal > 0 ? `${pendingTotal} Pending` : communityItems.length },
    { id: "rooms", label: "Live Rooms", icon: Radio, badge: getMetricNumber(stats?.totalRooms, rooms.length) },
    { id: "courses", label: "Course Catalog", icon: BookOpen, badge: subjects.length },
    { id: "models", label: "AI Models", icon: Cpu, badge: modelConfigs.length },
    { id: "aicore", label: "Nexus AI Core", icon: Sparkles },
    { id: "website", label: "Website Access", icon: websiteLockSettings.is_locked ? Lock : Globe, badge: websiteLockSettings.is_locked ? "LOCKED" : "OPEN" },
    { id: "logs", label: "Activity Audit Log", icon: History },
  ];

  const filteredModels = modelConfigs.filter((m) => {
    if (modelProviderFilter !== "all") {
      if (modelProviderFilter === "remote_qwen" && m.provider !== "ollama" && m.provider !== "remote_qwen") return false;
      if (modelProviderFilter !== "remote_qwen" && m.provider !== modelProviderFilter) return false;
    }
    if (modelStatusFilter === "default" && !m.is_default) return false;
    if (modelStatusFilter === "active" && (!m.enabled || m.is_paused || m.is_hidden)) return false;
    if (modelStatusFilter === "paused" && !m.is_paused) return false;
    if (modelStatusFilter === "hidden" && !m.is_hidden) return false;
    if (modelStatusFilter === "disabled" && m.enabled) return false;
    return true;
  });

  // Filter community items by status locally if selected
  const filteredCommunityItems = communityItems.filter(item => {
    if (communityStatusFilter === "all") return true;
    if (communityStatusFilter === "pending") return item.status === "pending";
    if (communityStatusFilter === "approved") return item.status === "approved" || item.status === "active";
    if (communityStatusFilter === "rejected") return item.status === "rejected";
    return true;
  });

  const overviewMetrics = [
    { label: "Total Users", metric: stats?.totalUsers, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Active Users", metric: stats?.activeUsers, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Suspended", metric: stats?.suspendedUsers, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
    { label: "Discussions", metric: stats?.discussionsCount, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { label: "Questions", metric: stats?.questionsCount, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Pending Approval", metric: stats?.pendingApprovalTotal, color: "text-amber-300 font-extrabold", bg: "bg-amber-500/20 border-amber-500/40 animate-pulse" },
    { label: "Study Groups", metric: stats?.studyGroupsCount, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Pending Reports", metric: stats?.pendingReports, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    { label: "Live Rooms", metric: stats?.totalRooms, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[350] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border ${
              toast.type === "error"
                ? "bg-rose-950/90 text-rose-200 border-rose-800/50"
                : "bg-emerald-950/90 text-emerald-200 border-emerald-800/50"
            }`}
          >
            {toast.type === "error" ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <span className="text-sm font-medium">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <ShieldAlert size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                Admin Control Center
              </h1>
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                Designated Admin
              </span>
            </div>
            <p className="text-sm text-[var(--muted)] mt-1">
              Website moderation, community content approval, live subject rooms, user suspension, and administrative audit.
            </p>
          </div>
        </div>

        {/* Enhanced Refresh Button */}
        <div className="flex items-center gap-3 z-10">
          <button
            onClick={handleRefresh}
            disabled={isPending || refreshState === "refreshing"}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-300 ${
              refreshState === "success"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/20"
                : refreshState === "refreshing"
                ? "bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/40 shadow-lg shadow-[var(--accent)]/20"
                : "bg-[var(--surface)] hover:bg-[var(--surface-hover)] border-[var(--border)] text-[var(--foreground)]"
            }`}
          >
            {refreshState === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <RefreshCw size={18} className={refreshState === "refreshing" ? "animate-spin text-[var(--accent)]" : ""} />
            )}
            <span>
              {refreshState === "refreshing" ? "Refreshing Data..." : refreshState === "success" ? "Data Updated!" : "Refresh All Data"}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Navigation Rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--border)] hide-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4.5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 relative ${
                isActive
                  ? "text-white bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-4">
            {overviewMetrics.map((m, i) => (
              <div key={i} className={`p-4.5 rounded-2xl border ${m.bg} backdrop-blur-sm space-y-1`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{m.label}</span>
                <div className={`text-2xl font-extrabold ${m.color}`}>
                  {renderStatCount(m.metric, refreshState === "refreshing")}
                </div>
              </div>
            ))}
          </div>

          {/* Shortcuts & Audit Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-4">
              <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <ShieldCheck size={20} className="text-[var(--accent)]" />
                <span>Admin Quick Actions</span>
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setActiveTab("users")}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-blue-400" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">Manage & Inspect Users</span>
                  </div>
                  <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setActiveTab("community")}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="text-purple-400" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">Moderate & Approve Content</span>
                  </div>
                  <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab("rooms");
                    setRoomModal({ mode: "create" });
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Radio size={18} className="text-teal-400" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">Create Live Subject Room</span>
                  </div>
                  <Plus size={18} className="text-teal-400" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                  <History size={20} className="text-purple-400" />
                  <span>Recent Moderation Audit Trail</span>
                </h2>
                <button onClick={() => setActiveTab("logs")} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                  View Full Audit Log →
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--muted)]">No audit activity logged yet.</div>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{log.details || log.action}</p>
                          <p className="text-[var(--muted)] mt-0.5">By {log.actor_email || "Admin"}</p>
                        </div>
                      </div>
                      <span className="text-[var(--muted)] font-mono shrink-0">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <form onSubmit={(e) => { e.preventDefault(); startTransition(async () => { const res = await fetchAdminUsers({ search: userSearch, statusFilter: userStatusFilter }); if (res.users) setUsers(res.users); }); }} className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Search
              </button>
            </form>

            <select
              value={userStatusFilter}
              onChange={(e) => {
                setUserStatusFilter(e.target.value);
                startTransition(async () => {
                  const res = await fetchAdminUsers({ search: userSearch, statusFilter: e.target.value });
                  if (res.users) setUsers(res.users);
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)]"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>

          <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
                  <tr>
                    <th className="p-4 pl-6">User</th>
                    <th className="p-4">Program</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Admin</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[var(--muted)]">No users found.</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleInspectUser(u)}>
                            <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold flex items-center justify-center text-sm uppercase shrink-0">
                              {(u.display_name || u.email || "U")[0]}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--foreground)] hover:underline">{u.display_name || u.full_name || "User"}</p>
                              <p className="text-xs text-[var(--muted)]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-semibold uppercase text-[var(--muted)]">{u.ib_program || "N/A"}</td>
                        <td className="p-4">
                          {(u.is_restricted || u.is_suspended) ? (
                            <span className="px-2.5 py-1 text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full inline-flex items-center gap-1">
                              <UserX size={12} /> Suspended
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full inline-flex items-center gap-1">
                              <UserCheck size={12} /> Active
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {u.is_admin && (
                            <span className="px-2 py-0.5 text-[11px] font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
                              ADMIN
                            </span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right space-x-2">
                          <button
                            onClick={() => handleInspectUser(u)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] text-xs font-bold transition-all inline-flex items-center gap-1"
                          >
                            <Eye size={14} /> Inspect
                          </button>

                          {u.id === adminUser.id ? (
                            <span className="px-2.5 py-1 text-xs font-bold text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                              Self (You)
                            </span>
                          ) : u.is_admin ? (
                            <span className="px-2.5 py-1 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                              Protected Admin
                            </span>
                          ) : (u.is_restricted || u.is_suspended) ? (
                            <button
                              onClick={() => handleRestoreUser(u)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all inline-flex items-center gap-1"
                            >
                              <UserCheck size={14} /> Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspendUser(u)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all inline-flex items-center gap-1"
                            >
                              <UserX size={14} /> Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMMUNITY MODERATION (With Post Approval Controls) */}
      {activeTab === "community" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <form onSubmit={handleSearchCommunity} className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search community items by title, author, or content..."
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Filter
              </button>
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={communityContentType}
                onChange={(e) => {
                  const val = e.target.value;
                  setCommunityContentType(val);
                  handleSearchCommunity(null, val, communityStatusFilter);
                }}
                className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)]"
              >
                <option value="all">All Content Types</option>
                <option value="discussion">Discussions</option>
                <option value="question">Questions</option>
                <option value="study_group">Study Group Requests</option>
                <option value="report">User Reports / Flags</option>
              </select>

              <select
                value={communityStatusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setCommunityStatusFilter(val);
                  handleSearchCommunity(null, communityContentType, val);
                }}
                className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)]"
              >
                <option value="all">All Moderation Statuses</option>
                <option value="pending">Pending Approval Only</option>
                <option value="approved">Approved Only</option>
                <option value="rejected">Rejected Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredCommunityItems.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
                No community items found for the selected filter.
              </div>
            ) : (
              filteredCommunityItems.map((item) => {
                const isQuestion = item.contentType === "question";
                const isStudyGroup = item.contentType === "study_group";
                const isReport = item.contentType === "report";
                const isPendingApproval = item.status === "pending";
                const isApproved = item.status === "approved" || item.status === "active";
                const isRejected = item.status === "rejected";

                return (
                  <div key={item.id} className={`p-6 rounded-3xl bg-[var(--card)] border space-y-4 shadow-sm transition-all ${
                    isPendingApproval ? "border-amber-500/40 bg-amber-500/5" : "border-[var(--border)] hover:border-[var(--accent)]/30"
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Type Badge */}
                          {isQuestion && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                              <HelpCircle size={12} /> Question
                            </span>
                          )}
                          {isStudyGroup && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-flex items-center gap-1">
                              <Users2 size={12} /> Study Group Request
                            </span>
                          )}
                          {isReport && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                              <Flag size={12} /> User Report
                            </span>
                          )}
                          {!isQuestion && !isStudyGroup && !isReport && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-flex items-center gap-1">
                              <MessageSquare size={12} /> Discussion
                            </span>
                          )}

                          {/* Approval Status Badge */}
                          {isPendingApproval && (
                            <span className="px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              PENDING APPROVAL
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              APPROVED
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              REJECTED
                            </span>
                          )}

                          <span className="text-xs font-semibold text-[var(--muted)]">{item.category}</span>
                          <span className="text-xs text-[var(--muted)]">•</span>
                          <span className="text-xs font-medium text-[var(--muted)]">By {item.author_name}</span>
                          <span className="text-xs text-[var(--muted)]">•</span>
                          <span className="text-xs font-mono text-[var(--muted)]">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>

                        <h3 className="text-lg font-bold text-[var(--foreground)]">{item.title}</h3>
                        <p className="text-sm text-[var(--muted)] line-clamp-2">{item.content}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {/* Approval / Rejection Quick Action Buttons */}
                        {(item.contentType === "discussion" || item.contentType === "question") && (
                          <>
                            {isPendingApproval || isRejected ? (
                              <button
                                onClick={() => handleApprovePost(item.id)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <CheckCircle2 size={14} />
                                <span>Approve Post</span>
                              </button>
                            ) : null}

                            {isPendingApproval || isApproved ? (
                              <button
                                onClick={() => handleRejectPost(item.id)}
                                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <XCircle size={14} />
                                <span>Reject</span>
                              </button>
                            ) : null}
                          </>
                        )}

                        {item.contentType === "study_group" && (
                          <>
                            {isPendingApproval ? (
                              <button
                                onClick={() => handleApproveStudyGroup(item.id)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <CheckCircle2 size={14} />
                                <span>Approve Group</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRejectStudyGroup(item.id)}
                                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <XCircle size={14} />
                                <span>Disable Group</span>
                              </button>
                            )}
                          </>
                        )}

                        {item.contentType === "report" && (
                          <button
                            onClick={() => handleDismissReport(item.id)}
                            className="px-3.5 py-2 rounded-xl bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border border-slate-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 size={14} />
                            <span>Dismiss Report</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleInspectItem(item)}
                          className="px-3.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Eye size={14} />
                          <span>Inspect & Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCommunityItem(item)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                          title="Delete Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: LIVE ROOMS */}
      {activeTab === "rooms" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-[var(--foreground)]">Active Live Subject Rooms</h2>
            <button
              onClick={() => setRoomModal({ mode: "create" })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={18} />
              <span>Create Room</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-4 flex flex-col justify-between shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {room.subject}
                    </span>
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${room.is_active !== false ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                      {room.is_active !== false ? "ACTIVE" : "DISABLED"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)]">{room.name}</h3>
                  <p className="text-sm text-[var(--muted)] line-clamp-2">{room.description || "Discuss HL/SL concepts and exam preparation."}</p>
                </div>

                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                  <button
                    onClick={() => handleOpenChatDrawer(room)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                    <MessageCircle size={14} />
                    <span>Moderate Chat</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRoomModal({ mode: "edit", room })}
                      className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-all"
                      title="Edit Room"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                      title="Delete Room"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COURSE CATALOG MANAGER (MYP 5 & DP 2) */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search course title or subject group..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <select
                value={subjectProgramFilter}
                onChange={(e) => setSubjectProgramFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-semibold text-[var(--foreground)]"
              >
                <option value="all">All Programmes</option>
                <option value="dp">DP 2 Catalog</option>
                <option value="myp">MYP 5 Catalog</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSeedCatalog}
                disabled={isSeedingSubjects}
                className="px-4 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                {isSeedingSubjects ? <RefreshCw size={14} className="animate-spin text-purple-400" /> : <Sparkles size={14} className="text-purple-400" />}
                <span>Sync / Seed Official Catalogs</span>
              </button>

              <button
                onClick={() => setSubjectModal({ mode: "create" })}
                className="px-4.5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[var(--accent)]/30 transition-all hover:brightness-110"
              >
                <Plus size={16} />
                <span>Add New Course</span>
              </button>
            </div>
          </div>

          {/* Program Track Badges Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              subjectProgramFilter === "dp" ? "bg-indigo-500/15 border-indigo-500/40" : "bg-[var(--card)] border-[var(--border)]"
            }`} onClick={() => setSubjectProgramFilter(f => f === "dp" ? "all" : "dp")}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                    DP 2 Curriculum Track
                  </span>
                  <h3 className="text-xl font-black text-[var(--foreground)] mt-2">Diploma Programme Catalog</h3>
                  <p className="text-xs text-[var(--muted)] mt-1">6 Official Subject Groups + DP Core (TOK, EE, CAS) with SL/HL level constraints.</p>
                </div>
                <span className="text-2xl font-black text-indigo-400">{subjects.filter(s => s.program === "dp").length}</span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              subjectProgramFilter === "myp" ? "bg-emerald-500/15 border-emerald-500/40" : "bg-[var(--card)] border-[var(--border)]"
            }`} onClick={() => setSubjectProgramFilter(f => f === "myp" ? "all" : "myp")}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                    MYP 5 Curriculum Track
                  </span>
                  <h3 className="text-xl font-black text-[var(--foreground)] mt-2">Middle Years Programme Catalog</h3>
                  <p className="text-xs text-[var(--muted)] mt-1">8 Official Subject Groups (Language Lit, Acquisition, Humanities, Sciences, Math, Arts, PHE, Design).</p>
                </div>
                <span className="text-2xl font-black text-emerald-400">{subjects.filter(s => s.program === "myp").length}</span>
              </div>
            </div>
          </div>

          {/* Subjects Table / List */}
          <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--foreground)]">Registered IB Course Catalog</h3>
                <p className="text-xs text-[var(--muted)]">Manage course titles, categories, and available SL/HL levels.</p>
              </div>
              <span className="text-xs font-semibold text-[var(--muted)]">Showing {
                subjects.filter(s => {
                  if (subjectProgramFilter !== "all" && s.program !== subjectProgramFilter) return false;
                  if (subjectSearch.trim()) {
                    const q = subjectSearch.toLowerCase();
                    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
                  }
                  return true;
                }).length
              } courses</span>
            </div>

            {subjects.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <BookOpen size={40} className="mx-auto text-[var(--muted)] opacity-50" />
                <p className="text-base font-bold text-[var(--foreground)]">No course subjects found in database</p>
                <p className="text-xs text-[var(--muted)] max-w-md mx-auto">Click "Sync / Seed Official Catalogs" to seed the official MYP 5 and DP 2 subject list into the system.</p>
                <button onClick={handleSeedCatalog} disabled={isSeedingSubjects} className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold shadow-md">
                  Seed Catalogs Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjects
                  .filter(s => {
                    if (subjectProgramFilter !== "all" && s.program !== subjectProgramFilter) return false;
                    if (subjectSearch.trim()) {
                      const q = subjectSearch.toLowerCase();
                      return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map(s => {
                    let parsedLevels = null;
                    if (s.available_levels) {
                      try {
                        parsedLevels = typeof s.available_levels === 'string' ? JSON.parse(s.available_levels) : s.available_levels;
                      } catch (e) {
                        parsedLevels = null;
                      }
                    }

                    return (
                      <div key={s.id} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all flex flex-col justify-between space-y-3 group">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              s.program === "myp" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                            }`}>
                              {s.program === "myp" ? "MYP 5" : "DP 2"}
                            </span>

                            {s.program === "dp" ? (
                              parsedLevels && Array.isArray(parsedLevels) ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--card)] text-[var(--muted)] border border-[var(--border)]">
                                  {parsedLevels.join(" / ")}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  DP Core (N/A)
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--card)] text-[var(--muted)] border border-[var(--border)]">
                                Group Level
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-extrabold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{s.name}</h4>
                          <p className="text-xs text-[var(--muted)] line-clamp-1">{s.category}</p>
                        </div>

                        <div className="pt-3 border-t border-[var(--border)]/60 flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSubjectModal({ mode: "edit", subject: s })}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            title="Edit course details"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubjectClick(s.id, s.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400 transition-colors"
                            title="Delete course"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* TAB: AI TRAINING */}
      {activeTab === "ai" && (
        <AiCoreTab />
      )}
      {/* TAB: WEBSITE ACCESS CONTROL */}
      {activeTab === "website" && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl backdrop-blur-xl relative overflow-hidden space-y-6 transition-all duration-300 ${
            websiteLockSettings.is_locked
              ? "bg-amber-950/20 border-amber-500/30 text-amber-100"
              : "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${
                  websiteLockSettings.is_locked
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                    : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                }`}>
                  {websiteLockSettings.is_locked ? <Lock size={32} /> : <Globe size={32} />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 text-xs font-black tracking-widest uppercase rounded-full border ${
                      websiteLockSettings.is_locked
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    }`}>
                      {websiteLockSettings.is_locked ? "🔴 WEBSITE LOCKED" : "🟢 WEBSITE OPEN"}
                    </span>
                    <span className="text-xs font-mono text-[var(--muted)] uppercase">
                      {websiteLockSettings.is_locked ? "System Preservation Mode" : "Normal Access Mode"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--foreground)]">
                    {websiteLockSettings.is_locked ? "IB Nexus Access Locked for Normal Users" : "IB Nexus Open to All Users"}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--muted)]">
                    {websiteLockSettings.is_locked
                      ? "Normal users opening the website will see the 3D book preservation screen. Admin access remains active."
                      : "All registered users can access their dashboard, study tools, community, and active modules normally."}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0">
                {websiteLockSettings.is_locked ? (
                  <button
                    onClick={() => setWebsiteLockConfirmModal("unlock")}
                    disabled={isUpdatingLock}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all"
                  >
                    {isUpdatingLock ? <RefreshCw size={18} className="animate-spin" /> : <Unlock size={18} />}
                    <span>{isUpdatingLock ? "Reopening..." : "Reopen Website"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setWebsiteLockConfirmModal("lock")}
                    disabled={isUpdatingLock}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2.5 transition-all"
                  >
                    {isUpdatingLock ? <RefreshCw size={18} className="animate-spin" /> : <Lock size={18} />}
                    <span>{isUpdatingLock ? "Locking..." : "Lock Website"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metadata Footprint */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--accent)]" />
                <span>Last Changed: {websiteLockSettings.updated_at ? new Date(websiteLockSettings.updated_at).toLocaleString() : "Initial setup"}</span>
              </div>
              {websiteLockSettings.updated_by && (
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-emerald-400" />
                  <span>Changed By: <strong className="text-[var(--foreground)]">{websiteLockSettings.updated_by}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Lock Message Control Box */}
          <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">User-Facing Lock Screen Notice</h3>
                <p className="text-xs text-[var(--muted)]">Optional announcement displayed to normal users on the preservation screen</p>
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                rows={3}
                value={lockMessageInput}
                onChange={(e) => setLockMessageInput(e.target.value)}
                placeholder="e.g. IB Nexus is temporarily unavailable while we prepare system upgrades. All your notes, flashcards, and data are safe."
                className="w-full p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">Notice is safely formatted and sanitized.</span>
                <button
                  onClick={handleSaveLockMessage}
                  disabled={isUpdatingLock}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-xs shadow-lg shadow-[var(--accent)]/20 flex items-center gap-2 transition-all"
                >
                  {isUpdatingLock ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Notice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Website Allowlist Section inside Website Access Tab */}
      {activeTab === "website" && (
        <div className="mt-6 p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Users2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Allowed Google Accounts</h3>
              <p className="text-xs text-[var(--muted)]">These Google accounts bypass the lock screen and can enter the website normally.</p>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = newAllowlistEmail.trim();
              if (!trimmed || isAddingAllowlist) return;

              setIsAddingAllowlist(true);
              const res = await addGoogleAccountToAllowlist(trimmed);
              setIsAddingAllowlist(false);

              if (res.success && res.account) {
                setAllowlist((prev) => [res.account, ...prev.filter((a) => a.id !== res.account.id)]);
                setNewAllowlistEmail("");
                showToast("Google account added to allowlist.", "success");
              } else {
                showToast(res.error || "Could not save the account. Please try again.", "error");
              }
            }}
            className="flex items-center gap-3"
          >
            <input
              type="email"
              value={newAllowlistEmail}
              onChange={(e) => setNewAllowlistEmail(e.target.value)}
              placeholder="student@gmail.com"
              disabled={isAddingAllowlist}
              className="flex-1 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAddingAllowlist || !newAllowlistEmail.trim()}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
            >
              {isAddingAllowlist ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>Add Account</span>
            </button>
          </form>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allowlist.length === 0 ? (
              <div className="text-center py-6 text-sm text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                No accounts allowed yet.<br />Admin accounts are always allowed.
              </div>
            ) : (
              allowlist.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--border)] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Globe size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--foreground)]">{acc.email}</span>
                      <span className="text-[10px] text-[var(--muted)] capitalize">Provider: {acc.provider || "google"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={removingAllowlistId === acc.id}
                    onClick={async () => {
                      if (confirm(`Remove ${acc.email} from the allowlist?`)) {
                        setRemovingAllowlistId(acc.id);
                        const res = await removeGoogleAccountFromAllowlist(acc.id, acc.email);
                        setRemovingAllowlistId(null);
                        if (res.success) {
                          setAllowlist((prev) => prev.filter((a) => a.id !== acc.id));
                          showToast("Google account removed from allowlist.", "success");
                        } else {
                          showToast(res.error || "Could not remove account. Please try again.", "error");
                        }
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {removingAllowlistId === acc.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    <span>Remove</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: ACTIVITY LOG AUDIT */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <form onSubmit={handleSearchLogs} className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search logs by action, details, actor email..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Search
              </button>
            </form>

            <select
              value={logCategoryFilter}
              onChange={(e) => {
                setLogCategoryFilter(e.target.value);
                startTransition(async () => {
                  const res = await fetchAdminActivityLogs({ search: logSearch, categoryFilter: e.target.value });
                  if (res.logs) setLogs(res.logs);
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)]"
            >
              <option value="all">All Event Categories</option>
              <option value="user">User Actions</option>
              <option value="post">Posts & Moderation</option>
              <option value="discussion">Discussions</option>
              <option value="study_group">Study Groups</option>
              <option value="room">Live Rooms</option>
            </select>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--foreground)]">System Administrative Audit Trail</h2>
                <p className="text-xs text-[var(--muted)]">Inspect, filter, or permanently delete system activity audit records.</p>
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearLogsModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 size={14} /> Clear All Logs Permanently
                </button>
              )}
            </div>

            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-[var(--muted)]">No audit activity recorded.</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm transition-colors group"
                  >
                    <div
                      onClick={() => setLogDetailModal(log)}
                      className="space-y-1 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[var(--foreground)] uppercase text-[10px] tracking-wider px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                          {log.action}
                        </span>
                        <span className="text-xs font-semibold text-[var(--muted)]">Target: {log.target_type} ({log.target_id || "N/A"})</span>
                      </div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{log.details}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-xs text-[var(--muted)] font-mono">
                        <p>{log.actor_email || "Admin"}</p>
                        <p>{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteLogModal(log);
                        }}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all text-xs font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100"
                        title="Delete log entry permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: AI MODELS MANAGEMENT */}
      {activeTab === "models" && (
        <div className="space-y-6">
          {/* Models Header & Default Selection */}
          <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex items-center gap-4 z-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                <Cpu size={24} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[var(--foreground)] tracking-tight">
                  AI Model Management
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Control active models, default selection, user display names, descriptions, and temporary pause/hidden states.
                </p>
              </div>
            </div>

            {/* Default Model Quick Bar */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] z-10">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Default Model:</span>
              <select
                value={modelConfigs.find(m => m.is_default || m.isDefault)?.model_id || modelConfigs.find(m => m.is_default || m.isDefault)?.id || ""}
                onChange={(e) => handleSetDefaultModel(e.target.value)}
                className="bg-[var(--card)] text-[var(--foreground)] text-xs font-bold px-3 py-1.5 rounded-xl border border-[var(--border)] focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {modelConfigs
                  .filter(m => m.enabled !== false && !m.is_paused && !m.is_hidden)
                  .map(m => {
                    const id = m.model_id || m.id;
                    const name = m.display_name || m.displayName || id;
                    const pName =
                      m.provider === "google"
                        ? "Google Gemini"
                        : m.provider === "openai"
                        ? "OpenAI"
                        : m.provider === "groq"
                        ? "Groq (LPU)"
                        : m.provider === "together"
                        ? "Together AI"
                        : m.provider === "remote_qwen" || m.provider === "ollama"
                        ? "Remote Qwen"
                        : m.provider;
                    return (
                      <option key={id} value={id}>
                        {name} — {pName}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter size={16} className="text-[var(--muted)]" />
              <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Filters:</span>
              
              {/* Provider Filter */}
              <select
                value={modelProviderFilter}
                onChange={(e) => setModelProviderFilter(e.target.value)}
                className="bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--border)]"
              >
                <option value="all">All Providers</option>
                <option value="google">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq (LPU)</option>
                <option value="together">Together AI</option>
                <option value="remote_qwen">Remote Qwen</option>
              </select>


              {/* Status Filter */}
              <select
                value={modelStatusFilter}
                onChange={(e) => setModelStatusFilter(e.target.value)}
                className="bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--border)]"
              >
                <option value="all">All Statuses</option>
                <option value="default">Default Model</option>
                <option value="active">Active & Available</option>
                <option value="paused">Paused</option>
                <option value="hidden">Hidden</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <span className="text-xs font-semibold text-[var(--muted)] font-mono">
              Showing {filteredModels.length} of {modelConfigs.length} models
            </span>
          </div>

          {/* Models Grid */}
          {filteredModels.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-3">
              <Cpu size={36} className="mx-auto text-[var(--muted)] opacity-50" />
              <h3 className="text-base font-bold text-[var(--foreground)]">No AI Models Match Filter</h3>
              <p className="text-xs text-[var(--muted)]">Try selecting different provider or status filter options.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModels.map((model) => {
                const providerLabel =
                  model.provider === "google"
                    ? "GOOGLE GEMINI"
                    : model.provider === "groq"
                    ? "GROQ (LPU)"
                    : model.provider === "together"
                    ? "TOGETHER AI"
                    : model.provider === "remote_qwen" || model.provider === "ollama"
                    ? "LOCAL / QWEN"
                    : model.provider.toUpperCase();

                return (
                  <div
                    key={model.model_id}
                    className={`p-6 rounded-3xl bg-[var(--card)] border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                      model.is_default
                        ? "border-amber-500/50 shadow-lg shadow-amber-500/10"
                        : model.is_paused
                        ? "border-amber-500/30 bg-amber-500/5"
                        : model.is_hidden
                        ? "border-purple-500/30 opacity-80"
                        : !model.enabled
                        ? "border-rose-500/30 opacity-60"
                        : "border-[var(--border)] hover:border-indigo-500/30"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {providerLabel}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {model.is_default && (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Star size={10} className="fill-amber-300" /> Default
                            </span>
                          )}
                          {model.is_paused && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Pause size={10} /> Paused
                            </span>
                          )}
                          {model.is_hidden && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <EyeOff size={10} /> Hidden
                            </span>
                          )}
                          {!model.enabled && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display Name & Model ID */}
                      <div>
                        <h3 className="text-lg font-extrabold text-[var(--foreground)] tracking-tight">
                          {model.display_name}
                        </h3>
                        <span className="text-[11px] font-mono text-[var(--muted)] block mt-0.5">
                          API Model ID: {model.model_id}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-3">
                        {model.description || "No description configured."}
                      </p>
                    </div>

                    {/* Controls & Actions */}
                    <div className="pt-4 border-t border-[var(--border)] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Pause / Resume Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePauseModel(model.model_id, model.is_paused)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                            model.is_paused
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                              : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          {model.is_paused ? <Play size={12} /> : <Pause size={12} />}
                          <span>{model.is_paused ? "Resume" : "Pause"}</span>
                        </button>

                        {/* Hide / Unhide Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleHideModel(model.model_id, model.is_hidden)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                            model.is_hidden
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30"
                              : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          {model.is_hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{model.is_hidden ? "Unhide" : "Hide"}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Enable / Disable Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleEnableModel(model.model_id, model.enabled)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                            !model.enabled
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
                          }`}
                        >
                          <Power size={12} />
                          <span>{model.enabled ? "Disable" : "Enable"}</span>
                        </button>

                        {/* Edit Metadata Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModelModal(model)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>

                      {/* Set as Default Button */}
                      {!model.is_default && (
                        <button
                          type="button"
                          disabled={!model.enabled || model.is_paused || model.is_hidden}
                          onClick={() => handleSetDefaultModel(model.model_id)}
                          className="w-full mt-2 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                        >
                          <Star size={12} />
                          <span>Set as Default Model</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DRAWER 1: USER DETAIL & INSPECTION */}
      <AnimatePresence>
        {userDrawer && (
          <div className="fixed inset-0 z-[300] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUserDrawer(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="relative w-full max-w-md bg-[var(--card)] border-l border-[var(--border)] shadow-2xl h-full flex flex-col z-10">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--foreground)]">User Account Inspector</h3>
                <button onClick={() => setUserDrawer(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="w-14 h-14 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-extrabold flex items-center justify-center text-xl uppercase">
                    {(userDrawer.profile?.display_name || userDrawer.profile?.email || "U")[0]}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-[var(--foreground)]">{userDrawer.profile?.display_name || userDrawer.profile?.full_name || "User"}</h4>
                    <p className="text-xs text-[var(--muted)]">{userDrawer.profile?.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--card)] text-[var(--muted)] border border-[var(--border)]">
                        {userDrawer.profile?.ib_program || "DP Candidate"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Posts</span>
                    <p className="text-lg font-extrabold text-[var(--foreground)]">{userDrawer.userStats?.postCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Replies</span>
                    <p className="text-lg font-extrabold text-[var(--foreground)]">{userDrawer.userStats?.replyCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Groups</span>
                    <p className="text-lg font-extrabold text-[var(--foreground)]">{userDrawer.userStats?.studyGroupCount || 0}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Account Actions</h5>
                  {userDrawer.profile?.is_suspended ? (
                    <button
                      onClick={() => handleRestoreUser(userDrawer.profile)}
                      className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <UserCheck size={16} /> Restore Account Access
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSuspendUser(userDrawer.profile)}
                      className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <UserX size={16} /> Suspend Account
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER 2: COMMUNITY CONTENT INSPECTION & MODERATION */}
      <AnimatePresence>
        {itemDrawer && (
          <div className="fixed inset-0 z-[300] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setItemDrawer(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="relative w-full max-w-xl bg-[var(--card)] border-l border-[var(--border)] shadow-2xl h-full flex flex-col z-10">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Content Inspector</span>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">{itemDrawer.item.contentType.toUpperCase()}</h3>
                </div>
                <button onClick={() => setItemDrawer(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!itemDrawer.isEditing ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {itemDrawer.item.category}
                        </span>

                        {itemDrawer.item.status === "pending" && (
                          <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            PENDING APPROVAL
                          </span>
                        )}
                        {(itemDrawer.item.status === "approved" || itemDrawer.item.status === "active") && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            APPROVED
                          </span>
                        )}
                        {itemDrawer.item.status === "rejected" && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            REJECTED
                          </span>
                        )}

                        <span className="text-xs font-semibold text-[var(--muted)]">Author: {itemDrawer.item.author_name}</span>
                      </div>
                      <h2 className="text-xl font-extrabold text-[var(--foreground)]">{itemDrawer.item.title}</h2>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                      {itemDrawer.item.content}
                    </div>

                    {itemDrawer.item.replies && itemDrawer.item.replies.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Replies ({itemDrawer.item.replies.length})</h4>
                        {itemDrawer.item.replies.map(r => (
                          <div key={r.id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs flex justify-between items-start">
                            <div>
                              <span className="font-bold text-[var(--foreground)]">{r.author_name}: </span>
                              <span className="text-[var(--muted)]">{r.content}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-6 border-t border-[var(--border)] flex-wrap">
                      {/* Discussion / Question Approval Controls */}
                      {(itemDrawer.item.contentType === "discussion" || itemDrawer.item.contentType === "question") && (
                        <>
                          {itemDrawer.item.status !== "approved" && (
                            <button
                              onClick={() => handleApprovePost(itemDrawer.item.id)}
                              className="py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-sm flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={16} /> Approve Post
                            </button>
                          )}
                          {itemDrawer.item.status !== "rejected" && (
                            <button
                              onClick={() => handleRejectPost(itemDrawer.item.id)}
                              className="py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-sm flex items-center gap-1.5"
                            >
                              <XCircle size={16} /> Reject Post
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => setItemDrawer(prev => ({ ...prev, isEditing: true }))}
                        className="py-2.5 px-4 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] font-bold text-sm flex items-center gap-1.5"
                      >
                        <Edit3 size={16} /> Edit
                      </button>

                      {itemDrawer.item.contentType === "study_group" && (
                        itemDrawer.item.status === "active" ? (
                          <button onClick={() => handleRejectStudyGroup(itemDrawer.item.id)} className="py-2.5 px-4 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-sm">
                            Reject
                          </button>
                        ) : (
                          <button onClick={() => handleApproveStudyGroup(itemDrawer.item.id)} className="py-2.5 px-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm">
                            Approve
                          </button>
                        )
                      )}

                      {itemDrawer.item.contentType === "report" && (
                        <button onClick={() => handleDismissReport(itemDrawer.item.id)} className="py-2.5 px-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm">
                          Dismiss Report
                        </button>
                      )}

                      <button onClick={() => handleDeleteCommunityItem(itemDrawer.item)} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-sm ml-auto">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveItemEdit(itemDrawer.item, new FormData(e.target)); }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Title</label>
                      <input type="text" name="title" defaultValue={itemDrawer.item.title} className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Subject Category</label>
                      <input type="text" name="category" defaultValue={itemDrawer.item.category} className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Content / Description</label>
                      <textarea name="content" rows={6} defaultValue={itemDrawer.item.content} className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                      <button type="button" onClick={() => setItemDrawer(prev => ({ ...prev, isEditing: false }))} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-sm">
                        Cancel
                      </button>
                      <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm shadow-lg shadow-[var(--accent)]/30 flex items-center gap-2">
                        {isPending && <RefreshCw size={14} className="animate-spin" />}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER 3: LIVE ROOM ADMIN CONTROL WORKSPACE */}
      <AnimatePresence>
        {chatDrawer && (
          <div className="fixed inset-0 z-[300] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChatDrawer(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="relative w-full max-w-2xl bg-[var(--card)] border-l border-[var(--border)] shadow-2xl h-full flex flex-col z-10 overflow-hidden">
              
              {/* Workspace Header */}
              <div className="p-6 border-b border-[var(--border)] bg-gradient-to-r from-indigo-950/50 via-background to-purple-950/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          ADMIN &rarr; ROOM CONTROL CENTER
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>REALTIME SYNC</span>
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight">
                        {chatDrawer.room?.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/community/rooms/${chatDrawer.room?.slug}`}
                      target="_blank"
                      className="px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Open live room page in new tab"
                    >
                      <span>Launch Room</span>
                      <ExternalLink size={14} />
                    </Link>
                    <button onClick={() => setChatDrawer(null)} className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Room Status Controls Bar */}
                <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Status:</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                      chatDrawer.room?.is_active !== false
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${chatDrawer.room?.is_active !== false ? "bg-emerald-400" : "bg-rose-400"}`} />
                      {chatDrawer.room?.is_active !== false ? "ACTIVE" : "PAUSED / DISABLED"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {chatDrawer.room?.is_active !== false ? (
                      <button
                        onClick={() => handleUpdateRoomStatus("Disabled")}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all"
                      >
                        Pause / Disable Room
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateRoomStatus("Active")}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all"
                      >
                        Re-Activate Room
                      </button>
                    )}
                    <button
                      onClick={() => setRoomModal({ mode: "edit", room: chatDrawer.room })}
                      className="px-3 py-1.5 rounded-xl bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Edit3 size={13} />
                      <span>Edit Room</span>
                    </button>
                  </div>
                </div>

                {/* Workspace Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 pt-1">
                  {[
                    { id: "messages", label: `Live Chat (${chatDrawer.messages.length})`, icon: MessageSquare },
                    { id: "participants", label: `Participants (${chatDrawer.participants.length})`, icon: Users },
                    { id: "details", label: "Room Details", icon: FileText },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setChatDrawerActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          chatDrawerActiveTab === tab.id
                            ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30"
                            : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                        }`}
                      >
                        <Icon size={14} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAB 1: LIVE CHAT STREAM & MODERATION */}
              {chatDrawerActiveTab === "messages" && (
                <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface)]/20">
                  
                  {/* Search Bar & Filter Bar */}
                  <div className="p-4 border-b border-[var(--border)] bg-[var(--card)]/80 space-y-3">
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                      <input
                        type="text"
                        value={chatDrawerSearch}
                        onChange={(e) => setChatDrawerSearch(e.target.value)}
                        placeholder="Search room messages by text or author name..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {[
                        { id: "all", label: "All Messages" },
                        { id: "moderators", label: "Moderator Messages" },
                        { id: "notices", label: "Official Notices" },
                        { id: "students", label: "Student Messages" },
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setChatDrawerFilter(filter.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            chatDrawerFilter === filter.id
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                              : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pinned Official Room Guidance Section in Workspace */}
                  {chatDrawer.messages.filter(m => m.is_notice === true && !m.is_deleted).length > 0 && (
                    <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950/90 via-amber-900/60 to-orange-950/70 border-2 border-amber-500/50 shadow-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                        <div className="flex items-center gap-2">
                          <Megaphone size={16} className="text-amber-400 animate-bounce" />
                          <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                            📌 PINNED OFFICIAL ROOM GUIDANCE
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-amber-300/80 font-mono">
                          {chatDrawer.messages.filter(m => m.is_notice === true && !m.is_deleted).length} Active Notice(s)
                        </span>
                      </div>
                      {chatDrawer.messages.filter(m => m.is_notice === true && !m.is_deleted).map(notice => (
                        <div key={notice.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-amber-100 leading-relaxed">{notice.content}</p>
                            <span className="text-[10px] text-amber-400/80 font-mono mt-1 block">
                              Posted by {notice.author_name} &bull; {new Date(notice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteChatMessage(notice.id)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 shrink-0 transition-colors"
                            title="Delete Official Notice"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Stream */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-3.5 custom-scrollbar">
                    {(() => {
                      const filtered = chatDrawer.messages.filter(msg => {
                        // Search filter
                        if (chatDrawerSearch.trim()) {
                          const q = chatDrawerSearch.toLowerCase();
                          const matchesContent = msg.content?.toLowerCase().includes(q);
                          const matchesAuthor = msg.author_name?.toLowerCase().includes(q);
                          if (!matchesContent && !matchesAuthor) return false;
                        }
                        // Category filter
                        if (chatDrawerFilter === "moderators") return msg.is_moderator;
                        if (chatDrawerFilter === "notices") return msg.is_notice;
                        if (chatDrawerFilter === "students") return !msg.is_moderator;
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="py-16 text-center space-y-2">
                            <MessageSquare className="w-10 h-10 text-[var(--muted)]/40 mx-auto" />
                            <p className="text-sm font-semibold text-[var(--muted)]">
                              {chatDrawerSearch ? "No messages found matching search query." : "No messages match selected filter."}
                            </p>
                          </div>
                        );
                      }

                      return filtered.map((msg) => (
                        <div
                          key={msg.id}
                          className={`relative p-4 rounded-2xl transition-all ${
                            msg.is_moderator
                              ? "bg-gradient-to-r from-indigo-950/50 via-purple-950/40 to-indigo-900/30 border-l-4 border-l-indigo-500 border-t border-r border-b border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                              : "bg-[var(--card)] border border-[var(--border)] shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2 flex-1">
                              {/* Author Header */}
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="text-xs font-black text-[var(--foreground)]">
                                  {msg.author_name}
                                </span>

                                {msg.is_moderator ? (
                                  <div
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-sm shadow-indigo-500/30 border border-indigo-400/40"
                                    title="Moderator — manages this live room and helps keep discussions respectful."
                                  >
                                    <ShieldCheck className="w-3 h-3 text-indigo-200" />
                                    <span>MODERATOR</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                                    <span>STUDENT</span>
                                  </div>
                                )}

                                <span className="text-[10px] text-[var(--muted)] ml-auto font-mono">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              {/* Notice Banner */}
                              {msg.is_notice && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-extrabold border border-amber-500/40">
                                  <Megaphone className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                                  <span>🛡 OFFICIAL ROOM GUIDANCE</span>
                                </div>
                              )}

                              {/* Message Body */}
                              <p className={`text-sm leading-relaxed ${msg.is_deleted ? "text-[var(--muted)] italic" : "text-[var(--foreground)] font-medium whitespace-pre-wrap"}`}>
                                {msg.content}
                              </p>
                            </div>

                            {/* Hard Delete Action */}
                            {!msg.is_deleted && (
                              <button
                                onClick={() => handleDeleteChatMessage(msg.id)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all shrink-0 hover:scale-105"
                                title="Hard delete message permanently from database"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Interactive Moderator Composer */}
                  <div className="p-4 border-t border-[var(--border)] bg-[var(--card)] space-y-3 shrink-0">
                    <form onSubmit={handleSendAdminChatMessage} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={adminChatIsNotice}
                            onChange={(e) => setAdminChatIsNotice(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-[var(--surface)] border-[var(--border)]"
                          />
                          <span className={`text-xs font-bold transition-colors ${adminChatIsNotice ? "text-amber-400" : "text-[var(--muted)] group-hover:text-[var(--foreground)]"}`}>
                            Post as Official Room Guidance Notice 🛡
                          </span>
                        </label>

                        <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                          <ShieldCheck size={13} />
                          Posting as Admin Moderator
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adminChatMessage}
                          onChange={(e) => setAdminChatMessage(e.target.value)}
                          placeholder={adminChatIsNotice ? "Type official room guidance notice..." : "Send live room message as Moderator..."}
                          className={`flex-1 px-4 py-2.5 rounded-2xl bg-[var(--surface)] border text-sm text-[var(--foreground)] focus:outline-none transition-all ${
                            adminChatIsNotice
                              ? "border-amber-500/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                              : "border-[var(--border)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={adminChatSending || !adminChatMessage.trim()}
                          className={`px-5 py-2.5 rounded-2xl text-white font-bold text-sm flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 shrink-0 ${
                            adminChatIsNotice
                              ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25"
                              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25"
                          }`}
                        >
                          {adminChatSending ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <>
                              <span>Post</span>
                              <Send size={15} />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: PARTICIPANTS & PRESENCE */}
              {chatDrawerActiveTab === "participants" && (
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-[var(--foreground)]">
                      Active Online Room Members ({chatDrawer.participants.length})
                    </h4>
                  </div>

                  {chatDrawer.participants.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[var(--muted)]">
                      No active participants currently tracked in this room.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {chatDrawer.participants.map((p) => (
                        <div key={p.user_id} className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 font-bold flex items-center justify-center text-sm">
                              {p.user_name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-[var(--foreground)]">{p.user_name}</span>
                                {p.is_moderator ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    MODERATOR
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--card)] text-[var(--muted)] border border-[var(--border)]">
                                    STUDENT
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[var(--muted)]">
                                Last active: {p.last_seen ? new Date(p.last_seen).toLocaleTimeString() : "Just now"}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleInspectUser({ id: p.user_id, full_name: p.user_name })}
                            className="px-3 py-1.5 rounded-xl bg-[var(--card)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Eye size={13} />
                            <span>Inspect User</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ROOM DETAILS & METADATA */}
              {chatDrawerActiveTab === "details" && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
                    <h4 className="text-sm font-extrabold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
                      Room Specification Details
                    </h4>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block font-bold text-[var(--muted)] uppercase mb-1">Room Name</span>
                        <span className="text-sm font-extrabold text-[var(--foreground)]">{chatDrawer.room?.name}</span>
                      </div>
                      <div>
                        <span className="block font-bold text-[var(--muted)] uppercase mb-1">Subject</span>
                        <span className="text-sm font-extrabold text-[var(--foreground)]">{chatDrawer.room?.subject}</span>
                      </div>
                      <div>
                        <span className="block font-bold text-[var(--muted)] uppercase mb-1">Room Slug</span>
                        <span className="font-mono text-[var(--foreground)]">{chatDrawer.room?.slug}</span>
                      </div>
                      <div>
                        <span className="block font-bold text-[var(--muted)] uppercase mb-1">Total Messages</span>
                        <span className="text-sm font-extrabold text-[var(--foreground)]">{chatDrawer.totalMessagesCount}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block font-bold text-[var(--muted)] uppercase mb-1">Description</span>
                        <p className="text-xs text-[var(--foreground)] bg-[var(--card)] p-3 rounded-xl border border-[var(--border)] leading-relaxed">
                          {chatDrawer.room?.description || "No description provided for this room."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => setRoomModal({ mode: "edit", room: chatDrawer.room })}
                      className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[var(--accent)]/30"
                    >
                      <Edit3 size={14} />
                      <span>Edit Room Metadata</span>
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(chatDrawer.room)}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      <span>Delete Room</span>
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRMATION */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-6 z-10">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-extrabold text-[var(--foreground)]">{confirmModal.title}</h3>
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{confirmModal.message}</p>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button onClick={() => setConfirmModal(null)} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--surface-hover)]">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    startTransition(async () => {
                      await confirmModal.actionFn();
                      setConfirmModal(null);
                    });
                  }}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
                >
                  {isPending && <RefreshCw size={14} className="animate-spin" />}
                  <span>{confirmModal.dangerText}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE / EDIT LIVE ROOM */}
      <AnimatePresence>
        {roomModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRoomModal(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-6 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-[var(--foreground)]">
                  {roomModal.mode === "create" ? "Create New Live Room" : "Edit Live Room"}
                </h3>
                <button onClick={() => setRoomModal(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const name = formData.get("name");
                  const subject = formData.get("subject");
                  const description = formData.get("description");
                  const is_active = formData.get("is_active") === "on";

                  startTransition(async () => {
                    let res;
                    if (roomModal.mode === "create") {
                      res = await createLiveRoomAction({ name, subject, description, is_active });
                    } else {
                      res = await updateLiveRoomAction(roomModal.room.id, { name, subject, description, is_active });
                    }

                    if (res.success) {
                      showToast(res.message, "success");
                      setRoomModal(null);
                      handleRefresh();
                    } else {
                      showToast(res.error, "error");
                    }
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Room Name</label>
                  <input type="text" name="name" required defaultValue={roomModal.room?.name || ""} placeholder="e.g. Biology HL Exam Prep" className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Subject</label>
                  <input type="text" name="subject" required defaultValue={roomModal.room?.subject || "Biology HL"} placeholder="e.g. Biology HL" className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Description</label>
                  <textarea name="description" rows={3} defaultValue={roomModal.room?.description || ""} placeholder="Discuss Biology HL concepts..." className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="is_active" name="is_active" defaultChecked={roomModal.room?.is_active !== false} className="w-4 h-4 rounded text-[var(--accent)]" />
                  <label htmlFor="is_active" className="text-sm font-semibold text-[var(--foreground)]">Room is Active & Visible to Students</label>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button type="button" onClick={() => setRoomModal(null)} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-sm">Cancel</button>
                  <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm shadow-lg shadow-[var(--accent)]/30 flex items-center gap-2">
                    {isPending && <RefreshCw size={14} className="animate-spin" />}
                    <span>{roomModal.mode === "create" ? "Create Room" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: LOG DETAIL */}
      <AnimatePresence>
        {logDetailModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLogDetailModal(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-4 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Audit Event Details</h3>
                <button onClick={() => setLogDetailModal(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={18} /></button>
              </div>
              <div className="space-y-2 text-sm text-[var(--foreground)]">
                <p><span className="font-bold text-[var(--muted)]">Action:</span> {logDetailModal.action}</p>
                <p><span className="font-bold text-[var(--muted)]">Target Type:</span> {logDetailModal.target_type}</p>
                <p><span className="font-bold text-[var(--muted)]">Target ID:</span> {logDetailModal.target_id || "N/A"}</p>
                <p><span className="font-bold text-[var(--muted)]">Actor:</span> {logDetailModal.actor_email || "Admin"}</p>
                <p><span className="font-bold text-[var(--muted)]">Timestamp:</span> {new Date(logDetailModal.created_at).toLocaleString()}</p>
                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] mt-2">
                  <span className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Details</span>
                  <p className="text-xs font-mono text-[var(--foreground)] whitespace-pre-wrap">{logDetailModal.details}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setLogDetailModal(null)} className="px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-xs font-bold">Close</button>
                <button
                  type="button"
                  onClick={() => {
                    const targetLog = logDetailModal;
                    setLogDetailModal(null);
                    setConfirmDeleteLogModal(targetLog);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Delete Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRM DELETE SINGLE LOG */}
      <AnimatePresence>
        {confirmDeleteLogModal && (
          <div className="fixed inset-0 z-[450] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeleteLogModal(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-4 z-10">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Delete Audit Log Entry</h3>
                  <p className="text-xs text-[var(--muted)]">Permanent database deletion</p>
                </div>
              </div>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                Are you sure you want to permanently delete this audit log entry? This action cannot be undone.
              </p>
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--muted)] space-y-1 font-mono">
                <p><strong className="text-[var(--foreground)]">Action:</strong> {confirmDeleteLogModal.action}</p>
                <p><strong className="text-[var(--foreground)]">Details:</strong> {confirmDeleteLogModal.details}</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setConfirmDeleteLogModal(null)} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDeleteSingleLog(confirmDeleteLogModal.id)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2"
                >
                  {isPending && <RefreshCw size={14} className="animate-spin" />}
                  <span>Delete Permanently</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRM CLEAR ALL LOGS */}
      <AnimatePresence>
        {confirmClearLogsModal && (
          <div className="fixed inset-0 z-[450] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmClearLogsModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md p-6 rounded-3xl bg-[var(--card)] border border-rose-500/30 shadow-2xl space-y-4 z-10">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Clear Entire Audit Log</h3>
                  <p className="text-xs text-rose-400 font-semibold">High Priority Admin Action</p>
                </div>
              </div>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-rose-400">ALL {logs.length} activity audit log records</strong>?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                ⚠️ Warning: This will erase the entire audit history from the system database permanently.
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setConfirmClearLogsModal(false)} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleClearAllLogs}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2"
                >
                  {isPending && <RefreshCw size={14} className="animate-spin" />}
                  <span>Clear All Logs Permanently</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT SUBJECT */}
      <AnimatePresence>
        {subjectModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSubjectModal(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-4 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-[var(--foreground)]">
                  {subjectModal.mode === "create" ? "Add New Course to Catalog" : "Edit Course Details"}
                </h3>
                <button onClick={() => setSubjectModal(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveSubjectSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Target Programme *</label>
                  <select name="program" defaultValue={subjectModal.subject?.program || "dp"} className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]">
                    <option value="dp">DP 2 (Diploma Programme)</option>
                    <option value="myp">MYP 5 (Middle Years Programme)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Subject Group / Category *</label>
                  <input type="text" name="category" required defaultValue={subjectModal.subject?.category || ""} placeholder="e.g. Group 4: Sciences" className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Course Title *</label>
                  <input type="text" name="name" required defaultValue={subjectModal.subject?.name || ""} placeholder="e.g. Biology" className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
                </div>

                <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
                  <span className="block text-xs font-bold uppercase text-[var(--muted)]">Available Levels (DP Only)</span>
                  <div className="flex items-center gap-4 text-xs font-semibold text-[var(--foreground)]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="level_sl"
                        defaultChecked={
                          !subjectModal.subject?.available_levels ||
                          (typeof subjectModal.subject.available_levels === 'string'
                            ? subjectModal.subject.available_levels.includes("SL")
                            : Array.isArray(subjectModal.subject.available_levels) && subjectModal.subject.available_levels.includes("SL"))
                        }
                        className="accent-[var(--accent)]"
                      />
                      <span>Standard Level (SL)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="level_hl"
                        defaultChecked={
                          subjectModal.subject?.available_levels
                            ? (typeof subjectModal.subject.available_levels === 'string'
                                ? subjectModal.subject.available_levels.includes("HL")
                                : Array.isArray(subjectModal.subject.available_levels) && subjectModal.subject.available_levels.includes("HL"))
                            : false
                        }
                        className="accent-[var(--accent)]"
                      />
                      <span>Higher Level (HL)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                  <button type="button" onClick={() => setSubjectModal(null)} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending} className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-xs shadow-lg shadow-[var(--accent)]/30 flex items-center gap-2">
                    {isPending && <RefreshCw size={14} className="animate-spin" />}
                    <span>{subjectModal.mode === "create" ? "Add Course" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AI KNOWLEDGE ITEM */}
      <AnimatePresence>
        {aiKnowledgeModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAiKnowledgeModal(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-4 z-10 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <Sparkles size={20} className="text-indigo-400" />
                  {aiKnowledgeModal.mode === "create" ? "Add AI Knowledge Item" : "Edit AI Knowledge Item"}
                </h3>
                <button onClick={() => setAiKnowledgeModal(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={18} /></button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 hide-scrollbar">
                <form id="aiKnowledgeForm" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const title = formData.get("title");
                  const subject_id = formData.get("subject_id") || null;
                  const content_type = formData.get("content_type");
                  const content = formData.get("content");
                  const metadataStr = formData.get("metadata");
                  
                  let metadata = null;
                  if (metadataStr) {
                    const keywords = metadataStr.split(",").map(k => k.trim()).filter(Boolean);
                    metadata = JSON.stringify({ keywords });
                  }
                  
                  startTransition(async () => {
                    let res;
                    if (aiKnowledgeModal.mode === "create") {
                      res = await addKnowledgeItemAction({ title, subject: subject_id, knowledgeType: content_type, content, metadata });
                    } else {
                      res = await editKnowledgeItemAction(aiKnowledgeModal.item.id, { title, subject: subject_id, knowledge_type: content_type, content, metadata });
                    }
                    
                    if (res.success) {
                      showToast(aiKnowledgeModal.mode === "create" ? "Added to AI knowledge base" : "Knowledge item updated", "success");
                      setAiKnowledgeModal(null);
                      // Optionally, refresh local state here or call handleRefresh()
                      setAiKnowledge(prev => {
                        if (aiKnowledgeModal.mode === "create") return [res.item, ...prev];
                        return prev.map(item => item.id === res.item.id ? res.item : item);
                      });
                    } else {
                      showToast(res.error, "error");
                    }
                  });
                }} className="space-y-4 pb-2">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <p className="text-xs text-indigo-300">
                      Knowledge items added here are injected into the Gemini AI's prompt when a student asks a relevant question.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Title *</label>
                    <input type="text" name="title" required defaultValue={aiKnowledgeModal.item?.title || ""} placeholder="e.g. IB Biology Paper 1 Format" className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Subject ID</label>
                      <input type="text" name="subject_id" defaultValue={aiKnowledgeModal.item?.subject_id || ""} placeholder="e.g. biology_hl" className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Content Type</label>
                      <select name="content_type" defaultValue={aiKnowledgeModal.item?.content_type || "concept"} className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500">
                        <option value="concept">Concept Explanation</option>
                        <option value="exam_tips">Exam Tips</option>
                        <option value="syllabus">Syllabus Info</option>
                        <option value="rubric">Grading Rubric</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Knowledge Content (Markdown) *</label>
                    <textarea name="content" required rows={6} defaultValue={aiKnowledgeModal.item?.content || ""} placeholder="Enter the knowledge content the AI should reference..." className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] font-mono focus:outline-none focus:border-indigo-500" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--muted)] mb-1">Matching Keywords (Comma separated)</label>
                    <input type="text" name="metadata" defaultValue={aiKnowledgeModal.item?.metadata ? JSON.parse(aiKnowledgeModal.item.metadata).keywords?.join(", ") : ""} placeholder="e.g. paper 1, multiple choice, biology" className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500" />
                  </div>
                </form>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)] shrink-0">
                <button type="button" onClick={() => setAiKnowledgeModal(null)} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" form="aiKnowledgeForm" disabled={isPending} className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 flex items-center gap-2">
                  {isPending && <RefreshCw size={14} className="animate-spin" />}
                  <span>{aiKnowledgeModal.mode === "create" ? "Add to Library" : "Save Changes"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: WEBSITE LOCK/UNLOCK CONFIRMATION */}
      <AnimatePresence>
        {websiteLockConfirmModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWebsiteLockConfirmModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md p-6 rounded-3xl bg-[var(--card)] border shadow-2xl space-y-5 z-10 ${
                websiteLockConfirmModal === "lock" ? "border-rose-500/30" : "border-emerald-500/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${
                  websiteLockConfirmModal === "lock"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {websiteLockConfirmModal === "lock" ? <Lock size={24} /> : <Unlock size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">
                    {websiteLockConfirmModal === "lock" ? "Lock IB Nexus Website?" : "Reopen IB Nexus Website?"}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {websiteLockConfirmModal === "lock" ? "System Preservation Trigger" : "Normal Access Restoration"}
                  </p>
                </div>
              </div>

              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                {websiteLockConfirmModal === "lock"
                  ? "Normal users will no longer be able to access the application. They will see the IB Nexus preservation screen until the website is reopened by an Admin."
                  : "This will restore normal application access for all registered users."}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setWebsiteLockConfirmModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingLock}
                  onClick={() => handleToggleWebsiteLock(websiteLockConfirmModal === "lock")}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg flex items-center gap-2 ${
                    websiteLockConfirmModal === "lock"
                      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                  }`}
                >
                  {isUpdatingLock && <RefreshCw size={14} className="animate-spin" />}
                  <span>{websiteLockConfirmModal === "lock" ? "Lock Website Now" : "Reopen Website Now"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT MODEL METADATA */}
      <AnimatePresence>
        {editingModelModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingModelModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg p-6 rounded-3xl bg-[var(--card)] border border-indigo-500/30 shadow-2xl space-y-5 z-10"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--foreground)]">
                      Edit Model Details
                    </h3>
                    <p className="text-xs font-mono text-[var(--muted)]">
                      ID: {editingModelModal.model_id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingModelModal(null)}
                  className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveModelMetadata} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
                    User-Facing Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="e.g. Gemini 2.5 Flash"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm border border-[var(--border)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
                    User-Facing Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Describe the model's primary academic strengths..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm border border-[var(--border)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
                    User Access Control (RBAC)
                  </label>
                  <select
                    value={editAllowedRoles}
                    onChange={(e) => setEditAllowedRoles(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm border border-[var(--border)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Users (Public)</option>
                    <option value="student">Registered Students Only</option>
                    <option value="premium">Premium Tiers Only</option>
                    <option value="admin">Admins Only</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
                      Max Output Tokens
                    </label>
                    <input
                      type="number"
                      min={256}
                      max={16384}
                      step={256}
                      value={editMaxTokens}
                      onChange={(e) => setEditMaxTokens(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm border border-[var(--border)] focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
                      Temperature ({editTemperature})
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={editTemperature}
                      onChange={(e) => setEditTemperature(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[var(--surface)] rounded-lg appearance-none cursor-pointer mt-3 accent-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
                    Fallback Model Selection
                  </label>
                  <select
                    value={editFallbackModelId}
                    onChange={(e) => setEditFallbackModelId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm border border-[var(--border)] focus:outline-none focus:border-indigo-500"
                  >
                    {modelConfigs
                      .filter((m) => m.model_id !== (editingModelModal.model_id || editingModelModal.id))
                      .map((m) => (
                        <option key={m.model_id} value={m.model_id}>
                          {m.display_name || m.model_id} ({m.provider})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted)]">Authoritative API Model ID</span>
                  <p className="text-xs font-mono text-indigo-300 font-semibold">{editingModelModal.model_id || editingModelModal.id}</p>
                  <p className="text-[11px] text-[var(--muted)]">The internal model ID remains locked and will be called by the backend API.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingModelModal(null)}
                    className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingModelEdit}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                  >
                    {isSubmittingModelEdit && <RefreshCw size={14} className="animate-spin" />}
                    <span>Save Model Details</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === "aicore" && (
        <AiCoreTab initialCoreVersions={initialCoreVersions} />
      )}
    </div>
  );
}
