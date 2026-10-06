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
  Cpu, Pause, Play, EyeOff, Star, ThumbsUp, ThumbsDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  suspendUserAction,
  unsuspendUserAction,
  restoreUserAction,
  restrictUserCommunicationAction,
  restoreUserCommunicationAction,
  fetchUserDetailStats,
  fetchAdminCommunityItems,
  updateCommunityContentAction,
  approvePostAction,
  rejectPostAction,
  updatePostStatusAction,
  fetchPostDetailsAndRepliesAction,
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
  fetchAdminUsers,
  deleteUserAccountAction,
  updateUserProfileByAdminAction,
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
  fetchContactMessagesAction,
  fetchAdminOverviewStats,
  getWebsiteAccessAllowlist,
} from "./actions";
import {
  fetchAdminAiCoreVersionsAction,
  fetchAdminAiFeedbackAction,
  updateAdminAiFeedbackStatusAction,
  updateAdminAiFeedbackNoteAction,
  deleteAdminAiFeedbackAction,
  deleteAllAdminNegativeFeedbackAction,
  deleteAllAdminPositiveFeedbackAction,
  deleteMultipleAdminAiFeedbackAction,
} from "./ai-actions";
import AiCoreTab from "./AiCoreTab";
import AiModelsTab from "./AiModelsTab";
import ContactInboxTab from "./ContactInboxTab";
import ResourceSubmissionsTab from "./ResourceSubmissionsTab";
import AdminRequestsTab from "./AdminRequestsTab";
import {
  bootstrapSubjectsDB,
  addGlobalSubjectAction,
  editGlobalSubjectAction,
  deleteGlobalSubjectAction,
  fetchGlobalSubjects,
} from "../subjects/actions";
import {
  ADMIN_INFORMATION_ARCHITECTURE,
  findGroupForSection,
  getAllSections,
} from "./admin-navigation";
import { PRESET_AVATARS } from "@/lib/avatars";

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

function renderUserAvatar(avatarUrl, displayName) {
  if (avatarUrl && (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("/"))) {
    return (
      <div className="relative w-9 h-9 shrink-0">
        <img
          src={avatarUrl}
          alt={displayName || "User"}
          className="w-9 h-9 rounded-full object-cover border border-[var(--border)] shrink-0 shadow-sm"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextSibling) {
              e.currentTarget.nextSibling.style.display = 'flex';
            }
          }}
        />
        <div className="hidden w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 font-extrabold items-center justify-center text-xs uppercase border border-indigo-500/30 shrink-0 shadow-sm">
          {(displayName || "U")[0].toUpperCase()}
        </div>
      </div>
    );
  }

  const preset = PRESET_AVATARS.find(p => p.id === avatarUrl);
  if (preset) {
    return (
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${preset.color} flex items-center justify-center text-sm border border-white/20 shrink-0 shadow-sm`}>
        <span>{preset.emoji}</span>
      </div>
    );
  }

  const initial = (displayName || "U")[0].toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 font-extrabold flex items-center justify-center text-xs uppercase border border-indigo-500/30 shrink-0 shadow-sm">
      {initial}
    </div>
  );
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
  initialAiFeedback = [],
  initialContactMessages = [],
  superAdminEmail = null,
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview"); // overview, users, contact_inbox, community, rooms, courses, models, feedback, aicore, website, logs
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
  const [aiFeedback, setAiFeedback] = useState(initialAiFeedback || []);
  const [contactMessages, setContactMessages] = useState(initialContactMessages || []);

  // AI Feedback States
  const [activeFeedbackTab, setActiveFeedbackTab] = useState("negative"); // negative | positive
  const [isSelectModeNeg, setIsSelectModeNeg] = useState(false);
  const [isSelectModePos, setIsSelectModePos] = useState(false);
  const [selectedNegativeIds, setSelectedNegativeIds] = useState([]);
  const [selectedPositiveIds, setSelectedPositiveIds] = useState([]);
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("all");

  const [showAdvancedSearchNeg, setShowAdvancedSearchNeg] = useState(false);
  const [showAdvancedSearchPos, setShowAdvancedSearchPos] = useState(false);

  const [advancedFiltersNeg, setAdvancedFiltersNeg] = useState({
    email: "", name: "", dateFrom: "", dateTo: "", topic: "", issueKeywords: "", userPrompt: "", aiResponse: "", modelId: "all", provider: "all", negativeStatus: "all", negativeReason: "all"
  });
  const [activeFiltersNeg, setActiveFiltersNeg] = useState(null);
  const [searchedNegativeFeedback, setSearchedNegativeFeedback] = useState(null);
  const [isSearchingNeg, setIsSearchingNeg] = useState(false);
  const [feedbackCountNeg, setFeedbackCountNeg] = useState(0);

  const [advancedFiltersPos, setAdvancedFiltersPos] = useState({
    email: "", name: "", dateFrom: "", dateTo: "", topic: "", issueKeywords: "", userPrompt: "", aiResponse: "", modelId: "all", provider: "all"
  });
  const [activeFiltersPos, setActiveFiltersPos] = useState(null);
  const [searchedPositiveFeedback, setSearchedPositiveFeedback] = useState(null);
  const [isSearchingPos, setIsSearchingPos] = useState(false);
  const [feedbackCountPos, setFeedbackCountPos] = useState(0);
  const [expandedPosFeedbackIds, setExpandedPosFeedbackIds] = useState([]);
  const [expandedNegFeedbackIds, setExpandedNegFeedbackIds] = useState([]);

  const toggleExpandPositiveFeedback = (id) => {
    setExpandedPosFeedbackIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleExpandNegativeFeedback = (id) => {
    setExpandedNegFeedbackIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [confirmDeleteFeedback, setConfirmDeleteFeedback] = useState(null);
  const [editingNoteModal, setEditingNoteModal] = useState(null);
  const [noteInputText, setNoteInputText] = useState("");

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
  const [userProgramFilter, setUserProgramFilter] = useState("all");
  const [editingUserModal, setEditingUserModal] = useState(null);
  const [editUserDisplayName, setEditUserDisplayName] = useState("");
  const [editUserFullName, setEditUserFullName] = useState("");
  const [editUserProgram, setEditUserProgram] = useState("DP");
  const [editUserExamSession, setEditUserExamSession] = useState("May 2026");
  const [editUserIsAdmin, setEditUserIsAdmin] = useState(false);
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);
  const [userSaveBanner, setUserSaveBanner] = useState(null);
  
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityContentType, setCommunityContentType] = useState("all");
  const [communityCategory, setCommunityCategory] = useState("all");
  const [communityStatusFilter, setCommunityStatusFilter] = useState("all");

  const [logSearch, setLogSearch] = useState("");
  const [logCategoryFilter, setLogCategoryFilter] = useState("all");

  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectProgramFilter, setSubjectProgramFilter] = useState("all");
  const [subjectModal, setSubjectModal] = useState(null);

  // Modals & Drawers
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [userDrawer, setUserDrawer] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [itemDrawer, setItemDrawer] = useState(null);
  const [roomModal, setRoomModal] = useState(null);
  const [chatDrawer, setChatDrawer] = useState(null);
  const [chatDrawerActiveTab, setChatDrawerActiveTab] = useState("messages");
  const [chatDrawerSearch, setChatDrawerSearch] = useState("");
  const [chatDrawerFilter, setChatDrawerFilter] = useState("all");
  const [adminChatMessage, setAdminChatMessage] = useState("");
  const [adminChatIsNotice, setAdminChatIsNotice] = useState(false);
  const [adminChatSending, setAdminChatSending] = useState(false);
  const [refreshingChat, setRefreshingChat] = useState(false);
  const [logDetailModal, setLogDetailModal] = useState(null);
  const [confirmDeleteLogModal, setConfirmDeleteLogModal] = useState(null);
  const [confirmClearLogsModal, setConfirmClearLogsModal] = useState(false);
  const [isSeedingSubjects, setIsSeedingSubjects] = useState(false);

  useEffect(() => {
    if (activeTab === "overview") {
      const interval = setInterval(() => {
        fetchAdminOverviewStats().then(sRes => {
          if (sRes?.stats) setStats(sRes.stats);
        }).catch(console.error);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isTargetSuperAdmin = (target) => {
    if (!target) return false;
    let email = "";
    if (typeof target === "string") {
      email = target;
    } else {
      email = target.email || target.user_metadata?.email || "";
    }
    const normalized = email.trim().toLowerCase();
    const superEnv = (superAdminEmail || "").trim().toLowerCase();
    return Boolean(
      superEnv && (normalized === superEnv || superEnv.split(",").map(e => e.trim().toLowerCase()).includes(normalized))
    );
  };

  const isSelfAccount = (target) => {
    if (!target || !adminUser) return false;
    const targetId = typeof target === "string" ? target : (target.id || target.user_id);
    const targetEmail = typeof target === "string" ? target : (target.email || target.user_metadata?.email || "");
    const normalizedEmail = (targetEmail || "").trim().toLowerCase();
    const currentEmail = (adminUser.email || "").trim().toLowerCase();

    return targetId === adminUser.id || (Boolean(currentEmail) && normalizedEmail === currentEmail);
  };

  const isProtectedAccount = (target) => {
    return isSelfAccount(target) || isTargetSuperAdmin(target);
  };

  const handleRefresh = () => {
    setRefreshState("refreshing");
    
    // Fire requests based on current section
    if (currentGroup.id === "overview_group") {
      fetchAdminOverviewStats().then(sRes => { if (sRes?.stats) setStats(sRes.stats); }).catch(console.error);
    } else if (currentGroup.id === "users_access_group") {
      fetchAdminUsers({ search: userSearch, statusFilter: userStatusFilter }).then(uRes => { if (uRes?.users) setUsers(uRes.users); }).catch(console.error);
      fetchWebsiteLockSettingsAction().then(lockRes => { if (lockRes?.settings) setWebsiteLockSettings(lockRes.settings); }).catch(console.error);
      getWebsiteAccessAllowlist().then(allowRes => { if (allowRes?.allowlist) setAllowlist(allowRes.allowlist); }).catch(console.error);
    } else if (currentGroup.id === "content_academics_group") {
      fetchAdminCommunityItems({ search: communitySearch, contentType: communityContentType, category: communityCategory }).then(cRes => { if (cRes?.items) setCommunityItems(cRes.items); }).catch(console.error);
      fetchGlobalSubjects().then(subRes => { if (subRes) setSubjects(subRes); }).catch(console.error);
    } else if (currentGroup.id === "community_live_group") {
      fetchAdminRooms().then(rRes => { if (rRes?.rooms) setRooms(rRes.rooms); }).catch(console.error);
    } else if (currentGroup.id === "system_logs_group") {
      fetchAdminActivityLogs({ search: logSearch, categoryFilter: logCategoryFilter }).then(lRes => { if (lRes?.logs) setLogs(lRes.logs); }).catch(console.error);
      fetchContactMessagesAction().then(contactRes => { if (contactRes?.messages) setContactMessages(contactRes.messages); }).catch(console.error);
    } else if (currentGroup.id === "ai_group") {
      fetchAdminModelConfigsAction().then(modRes => { if (modRes?.models) setModelConfigs(modRes.models); }).catch(console.error);
      fetchAdminAiFeedbackAction({ limit: 100 }).then(aiFeedRes => { if (aiFeedRes?.feedback) setAiFeedback(aiFeedRes.feedback); }).catch(console.error);
    }

    // Provide an immediate "quick blink" UX matching the inbox refresh speed
    setTimeout(() => {
      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 2500);
    }, 400);
  };

  // Allowlist Handlers
  const handleAddAllowlist = async (e) => {
    e.preventDefault();
    if (!newAllowlistEmail.trim() || !newAllowlistEmail.includes("@")) {
      showToast("Please enter a valid Google Account email.", "error");
      return;
    }
    setIsAddingAllowlist(true);
    startTransition(async () => {
      const res = await addGoogleAccountToAllowlist(newAllowlistEmail);
      setIsAddingAllowlist(false);
      if (res.success) {
        setAllowlist(prev => [res.item, ...prev]);
        setNewAllowlistEmail("");
        showToast(res.message, "success");
      } else {
        showToast(res.error || "Failed to add email to allowlist.", "error");
      }
    });
  };

  const handleRemoveAllowlist = async (id, email) => {
    if (isTargetSuperAdmin(email)) {
      showToast("Action Prohibited: The Super Admin email is protected and cannot be removed from the access allowlist.", "error");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${email}" from the website access allowlist?`)) return;
    setRemovingAllowlistId(id);
    startTransition(async () => {
      const res = await removeGoogleAccountFromAllowlist(id);
      setRemovingAllowlistId(null);
      if (res.success) {
        setAllowlist(prev => prev.filter(item => item.id !== id));
        showToast(res.message, "success");
      } else {
        showToast(res.error || "Failed to remove email from allowlist.", "error");
      }
    });
  };

  // Feedback Handlers
  const handleToggleSelectNegative = (id) => {
    setSelectedNegativeIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllNegative = (visibleIds) => {
    const allSelected = visibleIds.every(id => selectedNegativeIds.includes(id));
    if (allSelected) {
      setSelectedNegativeIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedNegativeIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const clearSelectedNegative = () => {
    setSelectedNegativeIds([]);
  };

  const handleToggleSelectPositive = (id) => {
    setSelectedPositiveIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllPositive = (visiblePosIds) => {
    const allSelected = visiblePosIds.every(id => selectedPositiveIds.includes(id));
    if (allSelected) {
      setSelectedPositiveIds(prev => prev.filter(id => !visiblePosIds.includes(id)));
    } else {
      setSelectedPositiveIds(prev => Array.from(new Set([...prev, ...visiblePosIds])));
    }
  };

  const clearSelectedPositive = () => {
    setSelectedPositiveIds([]);
  };

  const handleUpdateFeedbackStatus = async (feedbackId, status) => {
    startTransition(async () => {
      const res = await updateAdminAiFeedbackStatusAction(feedbackId, status);
      if (res.success) {
        showToast(`Feedback status updated to ${status.replace("_", " ")}`, "success");
        setAiFeedback(prev => prev.map(f => f.id === feedbackId ? { ...f, admin_status: status } : f));
      } else {
        showToast(res.error || "Failed to update feedback status", "error");
      }
    });
  };

  const handleSaveAdminNote = async () => {
    if (!editingNoteModal) return;
    startTransition(async () => {
      const res = await updateAdminAiFeedbackNoteAction(editingNoteModal.id, noteInputText);
      if (res.success) {
        showToast("Admin note saved", "success");
        setAiFeedback(prev => prev.map(f => f.id === editingNoteModal.id ? { ...f, admin_note: noteInputText } : f));
        setEditingNoteModal(null);
      } else {
        showToast(res.error || "Failed to save note", "error");
      }
    });
  };

  const handleDeleteFeedbackConfirm = async () => {
    if (!confirmDeleteFeedback) return;
    const { type, id } = confirmDeleteFeedback;
    startTransition(async () => {
      let res;
      if (type === 'single' && id) {
        res = await deleteAdminAiFeedbackAction(id);
        if (res.success) {
          setAiFeedback(prev => prev.filter(f => f.id !== id));
          setSelectedNegativeIds(prev => prev.filter(i => i !== id));
          setSelectedPositiveIds(prev => prev.filter(i => i !== id));
          showToast("Feedback report deleted", "success");
        }
      } else if (type === 'selected_neg') {
        res = await deleteMultipleAdminAiFeedbackAction(selectedNegativeIds);
        if (res.success) {
          setAiFeedback(prev => prev.filter(f => !selectedNegativeIds.includes(f.id)));
          setSelectedNegativeIds([]);
          setIsSelectModeNeg(false);
          showToast(`Deleted ${res.count} negative feedback record(s)`, "success");
        }
      } else if (type === 'selected_pos') {
        res = await deleteMultipleAdminAiFeedbackAction(selectedPositiveIds);
        if (res.success) {
          setAiFeedback(prev => prev.filter(f => !selectedPositiveIds.includes(f.id)));
          setSelectedPositiveIds([]);
          setIsSelectModePos(false);
          showToast(`Deleted ${res.count} positive feedback record(s)`, "success");
        }
      } else if (type === 'all_negative') {
        res = await deleteAllAdminNegativeFeedbackAction();
        if (res.success) {
          setAiFeedback(prev => prev.filter(f => f.rating !== 'negative'));
          setSelectedNegativeIds([]);
          setIsSelectModeNeg(false);
          showToast("All negative feedback cleared", "success");
        }
      } else if (type === 'all_positive') {
        res = await deleteAllAdminPositiveFeedbackAction();
        if (res.success) {
          setAiFeedback(prev => prev.filter(f => f.rating !== 'positive'));
          setSelectedPositiveIds([]);
          setIsSelectModePos(false);
          showToast("All positive feedback cleared", "success");
        }
      }

      if (res && !res.success) {
        showToast(res.error || "Failed to delete feedback", "error");
      }
      setConfirmDeleteFeedback(null);
    });
  };

  const handleAdvancedSearch = async (type) => {
    const isNeg = type === "negative";
    const filters = isNeg ? advancedFiltersNeg : advancedFiltersPos;
    const setSearching = isNeg ? setIsSearchingNeg : setIsSearchingPos;
    const setSearched = isNeg ? setSearchedNegativeFeedback : setSearchedPositiveFeedback;
    const setActive = isNeg ? setActiveFiltersNeg : setActiveFiltersPos;
    const setShow = isNeg ? setShowAdvancedSearchNeg : setShowAdvancedSearchPos;
    const setCount = isNeg ? setFeedbackCountNeg : setFeedbackCountPos;

    setSearching(true);
    try {
      const res = await fetchAdminAiFeedbackAction({
        limit: 1000,
        filters: { ...filters, rating: type }
      });
      if (res.success) {
        setSearched(res.feedback);
        setCount(res.count);
        setActive({ ...filters });
        setShow(false);
      } else {
        showToast("Unable to search feedback.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Unable to search feedback.", "error");
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = (type) => {
    if (type === "negative") {
      setSearchedNegativeFeedback(null);
      setActiveFiltersNeg(null);
      setAdvancedFiltersNeg({ email: "", name: "", dateFrom: "", dateTo: "", topic: "", issueKeywords: "", userPrompt: "", aiResponse: "", modelId: "all", provider: "all", negativeStatus: "all", negativeReason: "all" });
    } else {
      setSearchedPositiveFeedback(null);
      setActiveFiltersPos(null);
      setAdvancedFiltersPos({ email: "", name: "", dateFrom: "", dateTo: "", topic: "", issueKeywords: "", userPrompt: "", aiResponse: "", modelId: "all", provider: "all" });
    }
  };

  // User Actions
  const handleInspectUser = async (user) => {
    setUserDrawer({ user, loading: true });
    setUserStats(null);
    try {
      const res = await fetchUserDetailStats(user.id);
      if (res.success && res.stats) {
        setUserStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to load user stats", err);
    } finally {
      setUserDrawer(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const handleSuspendUser = async (userOrId) => {
    const targetUser = typeof userOrId === "object" ? userOrId : users.find(u => u.id === userOrId);
    const targetId = typeof userOrId === "object" ? userOrId.id : userOrId;

    if (isProtectedAccount(targetUser || targetId)) {
      showToast("Action Prohibited: Super Admin accounts cannot be suspended.", "error");
      return;
    }

    const userName = targetUser?.display_name || targetUser?.email || "this user";

    setConfirmModal({
      title: `Suspend Account Access (${userName})`,
      message: `Are you sure you want to suspend this user? They will be locked out from entering the website and will see a beautiful suspension notice when they try to enter. Their data (notes, AI conversations, planner items, profile) will remain 100% safe and intact, and you can unsuspend them at any time to restore full access.`,
      dangerText: "Suspend Account (Keep Data Safe)",
      actionFn: async () => {
        const res = await suspendUserAction(targetId);
        if (res.success) {
          setUsers(prev => prev.map(u => u.id === targetId ? { ...u, is_suspended: true } : u));
          if (userDrawer?.user?.id === targetId) setUserDrawer(prev => ({ ...prev, user: { ...prev.user, is_suspended: true } }));
          showToast(res.message || "User account suspended. Data preserved safely.", "success");
        } else {
          showToast(res.error || "Failed to suspend user account", "error");
        }
      }
    });
  };

  const handleUnsuspendUser = async (userOrId) => {
    const targetId = typeof userOrId === "object" ? userOrId.id : userOrId;
    startTransition(async () => {
      const res = await unsuspendUserAction(targetId);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === targetId ? { ...u, is_suspended: false } : u));
        if (userDrawer?.user?.id === targetId) setUserDrawer(prev => ({ ...prev, user: { ...prev.user, is_suspended: false } }));
        showToast(res.message || "User account access restored.", "success");
      } else {
        showToast(res.error || "Failed to restore user access", "error");
      }
    });
  };

  const handleRestoreUser = async (userId) => {
    return handleUnsuspendUser(userId);
  };

  const handleToggleRestrictComments = async (userOrId) => {
    const targetUser = typeof userOrId === "object" ? userOrId : users.find(u => u.id === userOrId);
    const targetId = typeof userOrId === "object" ? userOrId.id : userOrId;
    const isCurrentlyRestricted = Boolean(targetUser?.is_restricted);

    if (isProtectedAccount(targetUser || targetId)) {
      showToast("Action Prohibited: Super Admin accounts cannot be restricted.", "error");
      return;
    }

    startTransition(async () => {
      const res = isCurrentlyRestricted
        ? await restoreUserCommunicationAction(targetId)
        : await restrictUserCommunicationAction(targetId);

      if (res.success) {
        const newRestrictedVal = !isCurrentlyRestricted;
        setUsers(prev => prev.map(u => u.id === targetId ? { ...u, is_restricted: newRestrictedVal } : u));
        if (userDrawer?.user?.id === targetId) {
          setUserDrawer(prev => ({ ...prev, user: { ...prev.user, is_restricted: newRestrictedVal } }));
        }
        showToast(res.message, "success");
      } else {
        showToast(res.error || "Failed to update comment permissions", "error");
      }
    });
  };

  const handleDeleteUserAccount = (user) => {
    if (isProtectedAccount(user)) {
      showToast("Action Prohibited: Super Admin accounts cannot be deleted.", "error");
      return;
    }

    const userName = user.display_name || user.email || "this user";

    setConfirmModal({
      title: `Permanently Delete User Account (${userName})`,
      message: `Are you sure you want to PERMANENTLY delete user account "${userName}"? ALL their data (notes, AI tutor chats, flashcards, planner schedules, and posts) will be permanently erased. If they log in or sign up again later, they will restart with a brand new, fresh account from scratch. THIS ACTION CANNOT BE UNDONE.`,
      dangerText: "Permanently Delete & Wipe All Data",
      actionFn: async () => {
        const res = await deleteUserAccountAction(user.id);
        if (res.success) {
          setUsers(prev => prev.filter(u => u.id !== user.id));
          if (userDrawer?.user?.id === user.id) setUserDrawer(null);
          showToast(res.message || "User account and all data deleted permanently.", "success");
        } else {
          showToast(res.error || "Failed to delete user account", "error");
        }
      }
    });
  };

  const handleEditUserClick = (u) => {
    setUserSaveBanner(null);
    setEditingUserModal(u);
    setEditUserDisplayName(u.display_name || u.full_name || "");
    setEditUserFullName(u.full_name || "");
    setEditUserProgram(u.ib_program ? u.ib_program.toUpperCase() : "DP");
    setEditUserExamSession(u.exam_session || "May 2026");
    setEditUserIsAdmin(Boolean(u.is_admin));
  };

  const handleSaveUserEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUserModal) return;

    if (isProtectedAccount(editingUserModal) && !editUserIsAdmin) {
      showToast("Action Prohibited: Super Admin administrative privileges cannot be revoked.", "error");
      return;
    }

    setIsSavingUserEdit(true);
    setUserSaveBanner(null);

    startTransition(async () => {
      const res = await updateUserProfileByAdminAction({
        userId: editingUserModal.id,
        displayName: editUserDisplayName,
        fullName: editUserFullName,
        ibProgram: editUserProgram,
        examSession: editUserExamSession,
        isAdmin: editUserIsAdmin,
      });

      setIsSavingUserEdit(false);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === editingUserModal.id ? {
          ...u,
          display_name: editUserDisplayName,
          full_name: editUserFullName,
          ib_program: editUserProgram,
          exam_session: editUserExamSession,
          is_admin: editUserIsAdmin,
        } : u));

        if (userDrawer?.user?.id === editingUserModal.id) {
          setUserDrawer(prev => ({
            ...prev,
            user: {
              ...prev.user,
              display_name: editUserDisplayName,
              full_name: editUserFullName,
              ib_program: editUserProgram,
              exam_session: editUserExamSession,
              is_admin: editUserIsAdmin,
            }
          }));
        }

        const successText = `✨ User profile for "${editUserDisplayName || editingUserModal.email}" updated successfully!`;
        setUserSaveBanner({
          type: "success",
          message: successText,
        });
        showToast(successText, "success");

        setTimeout(() => {
          setEditingUserModal(null);
          setUserSaveBanner(null);
        }, 1400);
      } else {
        const errorText = res.error || "Failed to update user profile";
        setUserSaveBanner({
          type: "error",
          message: errorText,
        });
        showToast(errorText, "error");
      }
    });
  };

  // Community Content Actions
  const handleOpenItemDrawer = async (item) => {
    setItemDrawer({ item, isEditing: false, loadingReplies: true, replies: [] });
    if (item.contentType !== "report" && item.contentType !== "study_group") {
      try {
        const res = await fetchPostDetailsAndRepliesAction(item.id);
        if (res.success) {
          setItemDrawer(prev => {
            if (!prev || prev.item.id !== item.id) return prev;
            return {
              ...prev,
              item: { ...prev.item, ...(res.post || {}) },
              replies: res.replies || [],
              loadingReplies: false,
            };
          });
        } else {
          setItemDrawer(prev => prev ? { ...prev, loadingReplies: false } : null);
        }
      } catch (err) {
        console.error("Failed to load post details and replies:", err);
        setItemDrawer(prev => prev ? { ...prev, loadingReplies: false } : null);
      }
    } else {
      setItemDrawer(prev => prev ? { ...prev, loadingReplies: false } : null);
    }
  };

  const handleApprovePost = async (id) => {
    startTransition(async () => {
      const res = await approvePostAction(id);
      if (res.success) {
        setCommunityItems(prev => prev.filter(i => i.id !== id));
        setItemDrawer(null);
        showToast("Post approved and published to community page! Removed from moderation list.", "success");
      } else {
        showToast(res.error || "Failed to approve post", "error");
      }
    });
  };

  const handleRejectPost = async (id) => {
    startTransition(async () => {
      const res = await rejectPostAction(id);
      if (res.success) {
        setCommunityItems(prev => prev.map(i => i.id === id ? { ...i, status: "rejected" } : i));
        if (itemDrawer?.item?.id === id) setItemDrawer(prev => ({ ...prev, item: { ...prev.item, status: "rejected" } }));
        showToast("Post rejected", "success");
      } else {
        showToast(res.error || "Failed to reject post", "error");
      }
    });
  };

  const handleSetPostStatus = async (id, status) => {
    startTransition(async () => {
      const res = await updatePostStatusAction(id, status);
      if (res.success) {
        if (status === "approved") {
          setCommunityItems(prev => prev.filter(i => i.id !== id));
          setItemDrawer(null);
          showToast("Post approved and published to community page! Removed from moderation list.", "success");
        } else {
          setCommunityItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
          if (itemDrawer?.item?.id === id) {
            setItemDrawer(prev => ({ ...prev, item: { ...prev.item, status } }));
          }
          showToast(`Post status updated to ${status.toUpperCase()}`, "success");
        }
      } else {
        showToast(res.error || "Failed to update post status", "error");
      }
    });
  };

  const handleDeleteReply = async (replyId) => {
    setConfirmModal({
      title: "Delete Reply",
      message: "Are you sure you want to permanently delete this reply? This action cannot be undone.",
      dangerText: "Delete Reply",
      actionFn: async () => {
        const res = await deleteReplyAction(replyId);
        if (res.success) {
          setItemDrawer(prev => prev ? {
            ...prev,
            replies: (prev.replies || []).filter(r => r.id !== replyId),
            item: {
              ...prev.item,
              reply_count: Math.max(0, (prev.item.reply_count || 1) - 1)
            }
          } : null);
          showToast("Reply deleted successfully", "success");
        } else {
          showToast(res.error || "Failed to delete reply", "error");
        }
      }
    });
  };

  const handleApproveStudyGroup = async (id) => {
    startTransition(async () => {
      const res = await approveStudyGroupAction(id);
      if (res.success) {
        setCommunityItems(prev => prev.map(i => i.id === id ? { ...i, status: "active" } : i));
        if (itemDrawer?.item?.id === id) setItemDrawer(prev => ({ ...prev, item: { ...prev.item, status: "active" } }));
        showToast("Study group approved", "success");
      } else {
        showToast(res.error || "Failed to approve study group", "error");
      }
    });
  };

  const handleRejectStudyGroup = async (id) => {
    startTransition(async () => {
      const res = await rejectStudyGroupAction(id);
      if (res.success) {
        setCommunityItems(prev => prev.map(i => i.id === id ? { ...i, status: "rejected" } : i));
        if (itemDrawer?.item?.id === id) setItemDrawer(prev => ({ ...prev, item: { ...prev.item, status: "rejected" } }));
        showToast("Study group rejected", "success");
      } else {
        showToast(res.error || "Failed to reject study group", "error");
      }
    });
  };

  const handleDismissReport = async (id) => {
    startTransition(async () => {
      const res = await dismissReportAction(id);
      if (res.success) {
        setCommunityItems(prev => prev.filter(i => i.id !== id));
        if (itemDrawer?.item?.id === id) setItemDrawer(null);
        showToast("Report dismissed", "success");
      } else {
        showToast(res.error || "Failed to dismiss report", "error");
      }
    });
  };

  const handleDeleteCommunityItem = async (item) => {
    setConfirmModal({
      title: `Delete ${item.contentType || "Item"}`,
      message: `Are you sure you want to permanently delete "${item.title || "this content"}"? This action cannot be undone.`,
      dangerText: "Delete Permanently",
      actionFn: async () => {
        let res;
        const type = (item.contentType || "").toLowerCase();
        if (type === "discussion" || type === "question" || type === "post" || !type) {
          res = await deleteDiscussionAction(item.id);
        } else if (type === "study_group") {
          res = await deleteLiveRoomAction(item.id);
        } else {
          res = await dismissReportAction(item.id);
        }
        if (res.success) {
          setCommunityItems(prev => prev.filter(i => i.id !== item.id));
          if (itemDrawer?.item?.id === item.id) setItemDrawer(null);
          showToast("Item deleted permanently", "success");
        } else {
          showToast(res.error || "Failed to delete item", "error");
        }
      }
    });
  };

  const handleSaveItemEdit = async (item, formData) => {
    startTransition(async () => {
      const title = formData.get("title");
      const category = formData.get("category");
      const content = formData.get("content");

      const res = await updateCommunityContentAction(item.id, { title, category, content });
      if (res.success) {
        setCommunityItems(prev => prev.map(i => i.id === item.id ? { ...i, title, category, content } : i));
        setItemDrawer(prev => prev ? { ...prev, item: { ...prev.item, title, category, content }, isEditing: false } : null);
        showToast("Content updated successfully", "success");
      } else {
        showToast(res.error || "Failed to update content", "error");
      }
    });
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!roomModal) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.trim();
    const subject = formData.get("subject")?.trim();
    const description = formData.get("description")?.trim() || "";
    const max_participants = parseInt(formData.get("max_participants") || "50", 10);
    const is_active = formData.get("is_active") === "on";

    if (!name || !subject) {
      showToast("Room name and subject are required", "error");
      return;
    }

    startTransition(async () => {
      let res;
      if (roomModal.mode === "create") {
        res = await createLiveRoomAction({ name, subject, description, max_participants, is_active });
      } else {
        res = await updateLiveRoomAction(roomModal.room.id, { name, subject, description, max_participants, is_active });
      }
      if (res.success) {
        setRoomModal(null);
        showToast(roomModal.mode === "create" ? "Live room created successfully" : "Live room updated", "success");
        if (res.room) {
          if (roomModal.mode === "create") {
            setRooms(prev => [res.room, ...prev.filter(r => r.id !== res.room.id)]);
          } else {
            setRooms(prev => prev.map(r => r.id === roomModal.room.id ? { ...r, ...res.room } : r));
          }
        }
        const fresh = await fetchAdminRooms();
        if (fresh?.success && fresh.rooms) setRooms(fresh.rooms);
      } else {
        showToast(res.error || "Failed to save room", "error");
      }
    });
  };

  // Live Room Handlers
  const handleInspectRoom = async (room) => {
    setChatDrawer({ room, messages: [], participants: [], totalMessagesCount: 0 });
    setChatDrawerActiveTab("messages");
    setChatDrawerSearch("");
    setChatDrawerFilter("all");

    try {
      const res = await fetchRoomMessagesForModeration(room.id);
      if (res.success) {
        setChatDrawer(prev => prev ? {
          ...prev,
          messages: res.messages || [],
          participants: res.participants || [],
          totalMessagesCount: res.totalMessagesCount || (res.messages || []).length
        } : null);
      }
    } catch (err) {
      showToast("Error loading room moderation workspace", "error");
    }
  };

  const handleUpdateRoomStatus = async (targetStatus) => {
    if (!chatDrawer?.room?.id) return;
    const isTargetActive = targetStatus === "Active";
    startTransition(async () => {
      const res = await updateRoomStatusAction(chatDrawer.room.id, isTargetActive);
      if (res.success) {
        setRooms(prev => prev.map(r => r.id === chatDrawer.room.id ? { ...r, is_active: isTargetActive } : r));
        setChatDrawer(prev => prev ? { ...prev, room: { ...prev.room, is_active: isTargetActive } } : null);
        showToast(res.message, "success");
      } else {
        showToast(res.error || "Failed to update room status", "error");
      }
    });
  };

  const handleToggleRoomStatus = () => {
    if (!chatDrawer?.room?.id) return;
    const isTargetActive = !chatDrawer.room?.is_active;
    startTransition(async () => {
      const res = await updateRoomStatusAction(chatDrawer.room.id, isTargetActive);
      if (res.success) {
        setRooms(prev => prev.map(r => r.id === chatDrawer.room.id ? { ...r, is_active: isTargetActive } : r));
        setChatDrawer(prev => prev ? { ...prev, room: { ...prev.room, is_active: isTargetActive } } : null);
        showToast(res.message || `Room marked ${isTargetActive ? "Active" : "Paused"}`, "success");
      } else {
        showToast(res.error || "Failed to update room status", "error");
      }
    });
  };

  const handleDeleteChatMessage = async (msgId) => {
    if (!confirm("Are you sure you want to permanently delete this room message?")) return;
    startTransition(async () => {
      const res = await deleteChatMessageAction(msgId);
      if (res.success) {
        setChatDrawer(prev => prev ? {
          ...prev,
          messages: prev.messages.filter(m => m.id !== msgId)
        } : null);
        showToast("Message deleted from live room", "success");
      } else {
        showToast(res.error || "Failed to delete message", "error");
      }
    });
  };

  const handleDeleteRoom = async (room) => {
    setConfirmModal({
      title: "Delete Live Room",
      message: `Are you sure you want to delete room "${room.name}"? All chat history and room settings will be deleted permanently.`,
      dangerText: "Delete Live Room",
      actionFn: async () => {
        const res = await deleteLiveRoomAction(room.id);
        if (res.success) {
          setRooms(prev => prev.filter(r => r.id !== room.id));
          if (chatDrawer?.room?.id === room.id) setChatDrawer(null);
          showToast(res.message, "success");
        } else {
          showToast(res.error || "Failed to delete room", "error");
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
          setChatDrawer(prev => prev ? {
            ...prev,
            messages: refreshed.messages || [],
            participants: refreshed.participants || prev.participants || [],
            totalMessagesCount: refreshed.totalMessagesCount || (refreshed.messages || []).length
          } : null);
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

  const handleRefreshChatDrawer = async () => {
    if (!chatDrawer?.room?.id || refreshingChat) return;
    setRefreshingChat(true);
    try {
      const refreshed = await fetchRoomMessagesForModeration(chatDrawer.room.id);
      if (refreshed.success) {
        setChatDrawer(prev => prev ? {
          ...prev,
          messages: refreshed.messages || [],
          participants: refreshed.participants || prev.participants || [],
          totalMessagesCount: refreshed.totalMessagesCount || (refreshed.messages || []).length
        } : null);
        showToast("Room chat refreshed", "success");
      } else {
        showToast("Failed to refresh chat messages", "error");
      }
    } catch (err) {
      showToast(err.message || "Error refreshing chat", "error");
    } finally {
      setRefreshingChat(false);
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
          setSubjects(prev => [{ id: "temp-" + Date.now(), program, category, name, available_levels }, ...prev]);
        } else {
          await editGlobalSubjectAction(subjectModal.subject.id, program, category, name, available_levels);
          showToast(`Updated ${name}`, "success");
          setSubjects(prev => prev.map(s => s.id === subjectModal.subject.id ? { ...s, program, category, name, available_levels } : s));
        }
        setSubjectModal(null);
        const fresh = await fetchGlobalSubjects();
        if (Array.isArray(fresh)) setSubjects(fresh);
      } catch (err) {
        showToast(err.message || "Failed to save subject", "error");
      }
    });
  };
  const handleSaveSubject = handleSaveSubjectSubmit;

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
        is_locked: targetLockedState,
        lock_message: lockMessageInput,
      });
      setIsUpdatingLock(false);
      if (res.success) {
        setWebsiteLockSettings(res.settings);
        const currentEmail = adminUser?.email?.trim().toLowerCase();
        const isSuper = Boolean(superAdminEmail && currentEmail === superAdminEmail);

        if (targetLockedState) {
          if (!isSuper) {
            // Normal admin: immediately throw out to lock screen
            window.location.href = "/";
            return;
          } else {
            showToast("Website is now LOCKED. Super Admin skeleton access active.", "success");
          }
        } else {
          showToast(res.message || "Website UNLOCKED for all users.", "success");
        }
      } else {
        showToast(res.error || "Failed to update website status", "error");
      }
    });
  };

  const handleSaveLockMessage = async () => {
    setIsUpdatingLock(true);
    startTransition(async () => {
      const res = await updateWebsiteLockStatusAction({
        is_locked: websiteLockSettings.is_locked,
        lock_message: lockMessageInput,
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
        showToast(res.error || "Failed to update model pause status", "error");
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
        showToast(res.error || "Failed to update model visibility", "error");
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
        showToast(res.error || "Failed to update model state", "error");
      }
    });
  };

  const handleOpenEditModelModal = (m) => {
    setEditingModelModal(m);
    setEditDisplayName(m.display_name || m.model_id);
    setEditDescription(m.description || "");
    setEditAllowedRoles(m.allowed_roles || m.allowedRoles || "all");
    setEditMaxTokens(m.max_tokens || m.maxTokens || 2048);
    setEditTemperature(m.temperature || 0.7);
    setEditFallbackModelId(m.fallback_model_id || m.fallbackModelId || "gemini-3.6-flash");
  };

  const handleSaveModelMetadataSubmit = async (e) => {
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

  // Derived Navigation Group
  const currentGroup = findGroupForSection(activeTab);

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

  const filteredCommunityItems = communityItems.filter(item => {
    // Approved posts are removed permanently from moderation list
    if (item.status === "approved" || item.status === "active") return false;
    if (communityStatusFilter === "all") return true;
    if (communityStatusFilter === "pending") return item.status === "pending";
    if (communityStatusFilter === "rejected") return item.status === "rejected";
    return true;
  });

  // Base Feedback Lists
  const baseNegativeFeedback = searchedNegativeFeedback !== null ? searchedNegativeFeedback : aiFeedback.filter(f => f.rating === 'negative');
  const basePositiveFeedback = searchedPositiveFeedback !== null ? searchedPositiveFeedback : aiFeedback.filter(f => f.rating === 'positive');

  const filteredAiFeedback = baseNegativeFeedback.filter(f => {
    if (feedbackSearch.trim()) {
      const q = feedbackSearch.toLowerCase();
      const matchesPrompt = f.prompt?.toLowerCase().includes(q);
      const matchesAiResponse = f.ai_response?.toLowerCase().includes(q);
      const matchesComment = f.comment?.toLowerCase().includes(q);
      const matchesCategory = f.category?.toLowerCase().includes(q);
      const matchesUser = f.users?.email?.toLowerCase().includes(q) || f.users?.raw_user_meta_data?.display_name?.toLowerCase().includes(q) || f.users?.raw_user_meta_data?.full_name?.toLowerCase().includes(q);
      if (!matchesPrompt && !matchesAiResponse && !matchesComment && !matchesCategory && !matchesUser) return false;
    }

    if (feedbackStatusFilter === "reported") {
      if (f.admin_status !== "reported" && f.admin_status !== "new" && f.admin_status !== null) return false;
    } else if (feedbackStatusFilter === "under_review") {
      if (f.admin_status !== "under_review") return false;
    } else if (feedbackStatusFilter === "resolved") {
      if (f.admin_status !== "resolved") return false;
    } else if (feedbackStatusFilter === "unresolved") {
      if (f.admin_status === "resolved") return false;
    }

    return true;
  });

  const positiveItems = basePositiveFeedback.filter(f => {
    if (feedbackSearch.trim()) {
      const q = feedbackSearch.toLowerCase();
      const matchesPrompt = f.prompt?.toLowerCase().includes(q);
      const matchesAiResponse = f.ai_response?.toLowerCase().includes(q);
      const matchesComment = f.comment?.toLowerCase().includes(q);
      const matchesUser = f.users?.email?.toLowerCase().includes(q) || f.users?.raw_user_meta_data?.display_name?.toLowerCase().includes(q) || f.users?.raw_user_meta_data?.full_name?.toLowerCase().includes(q);
      if (!matchesPrompt && !matchesAiResponse && !matchesComment && !matchesUser) return false;
    }
    return true;
  });

  const visibleNegIds = filteredAiFeedback.map(f => f.id);
  const allVisibleNegSelected = visibleNegIds.length > 0 && visibleNegIds.every(id => selectedNegativeIds.includes(id));

  const visiblePosIds = positiveItems.map(f => f.id);
  const allVisiblePosSelected = visiblePosIds.length > 0 && visiblePosIds.every(id => selectedPositiveIds.includes(id));

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

  const renderActiveFilterChips = (activeFilters, type) => {
    if (!activeFilters) return null;
    const chips = [];
    const pushChip = (key, label, value) => {
      if (value && value !== "all") {
        chips.push({
          key, label, value,
          remove: () => {
            if (type === 'negative') {
              const next = { ...advancedFiltersNeg, [key]: key === 'modelId' || key === 'provider' || key === 'negativeStatus' || key === 'negativeReason' ? 'all' : '' };
              setAdvancedFiltersNeg(next);
              setTimeout(() => handleAdvancedSearch('negative'), 50);
            } else {
              const next = { ...advancedFiltersPos, [key]: key === 'modelId' || key === 'provider' ? 'all' : '' };
              setAdvancedFiltersPos(next);
              setTimeout(() => handleAdvancedSearch('positive'), 50);
            }
          }
        });
      }
    };
    pushChip('email', 'Email', activeFilters.email);
    pushChip('name', 'Name', activeFilters.name);
    pushChip('dateFrom', 'From', activeFilters.dateFrom);
    pushChip('dateTo', 'To', activeFilters.dateTo);
    pushChip('topic', 'Topic', activeFilters.topic);
    pushChip('issueKeywords', 'Keyword', activeFilters.issueKeywords);
    pushChip('userPrompt', 'Prompt', activeFilters.userPrompt);
    pushChip('aiResponse', 'Response', activeFilters.aiResponse);
    pushChip('modelId', 'Model', activeFilters.modelId);
    pushChip('provider', 'Provider', activeFilters.provider);
    if (type === 'negative') {
      pushChip('negativeStatus', 'Status', activeFilters.negativeStatus);
      pushChip('negativeReason', 'Reason', activeFilters.negativeReason);
    }
    
    if (chips.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <span className="text-xs font-bold text-[var(--muted)]">{chips.length} active filter{chips.length > 1 ? 's' : ''}:</span>
        {chips.map(c => (
          <span key={c.key} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold">
            <span><span className="opacity-60">{c.label}:</span> {c.value}</span>
            <button onClick={c.remove} className="hover:bg-indigo-500/20 p-0.5 rounded transition-colors"><X size={12} /></button>
          </span>
        ))}
        <button onClick={() => handleClearSearch(type)} className="text-xs font-bold text-[var(--muted)] hover:text-[var(--foreground)] ml-2 transition-colors">
          Clear Filters
        </button>
      </div>
    );
  };

  const renderAdvancedSearchPanel = (type) => {
    const isNeg = type === "negative";
    const show = isNeg ? showAdvancedSearchNeg : showAdvancedSearchPos;
    const filters = isNeg ? advancedFiltersNeg : advancedFiltersPos;
    const setFilters = isNeg ? setAdvancedFiltersNeg : setAdvancedFiltersPos;
    const isSearching = isNeg ? isSearchingNeg : isSearchingPos;
    const activeFilters = isNeg ? activeFiltersNeg : activeFiltersPos;

    if (!show) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 mb-6 shadow-sm overflow-hidden"
      >
        <div className="flex flex-col gap-1 mb-5">
          <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <Search size={14} className="text-[var(--muted)]" />
            Find Feedback
          </h3>
          <p className="text-xs text-[var(--muted)]">Search and combine filters to locate specific feedback records.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">User</h4>
            <input type="text" placeholder="Email (e.g. user@gmail.com)" value={filters.email} onChange={e => setFilters({...filters, email: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]" />
            <input type="text" placeholder="User Name" value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]" />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Time</h4>
            <div className="flex items-center gap-2">
              <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]" />
              <span className="text-[var(--muted)] text-xs">to</span>
              <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]" />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Content</h4>
            <input type="text" placeholder="Topic / Subject" value={filters.topic} onChange={e => setFilters({...filters, topic: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]" />
            <input type="text" placeholder="Issue Keywords" value={filters.issueKeywords} onChange={e => setFilters({...filters, issueKeywords: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]" />
            <input type="text" placeholder="User Question / Prompt" value={filters.userPrompt} onChange={e => setFilters({...filters, userPrompt: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]" />
            <input type="text" placeholder="AI Response" value={filters.aiResponse} onChange={e => setFilters({...filters, aiResponse: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]" />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">AI & Status</h4>
            <select value={filters.modelId} onChange={e => setFilters({...filters, modelId: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]">
              <option value="all">Any Model</option>
              {modelConfigs.map(m => <option key={m.model_id} value={m.model_id}>{m.display_name || m.model_id}</option>)}
            </select>
            <select value={filters.provider} onChange={e => setFilters({...filters, provider: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]">
              <option value="all">Any Provider</option>
              <option value="google">Google</option>
              <option value="groq">Groq</option>
              <option value="together">Together AI</option>
            </select>
            {isNeg && (
              <>
                <select value={filters.negativeStatus} onChange={e => setFilters({...filters, negativeStatus: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]">
                  <option value="all">Any Status</option>
                  <option value="reported">Reported by User</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                </select>
                <select value={filters.negativeReason} onChange={e => setFilters({...filters, negativeReason: e.target.value})} className="w-full h-9 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs text-[var(--foreground)]">
                  <option value="all">Any Reason</option>
                  <option value="inaccurate">Inaccurate / Wrong</option>
                  <option value="unhelpful">Unhelpful</option>
                  <option value="harmful">Harmful / Inappropriate</option>
                  <option value="formatting">Formatting Issue</option>
                </select>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border)]">
          <button onClick={() => handleClearSearch(type)} className="text-xs font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            Reset Filters
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => (isNeg ? setShowAdvancedSearchNeg(false) : setShowAdvancedSearchPos(false))} className="px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)]">
              Cancel
            </button>
            <button onClick={() => handleAdvancedSearch(type)} disabled={isSearching} className="px-4 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md">
              {isSearching ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
              Apply Filters
            </button>
          </div>
        </div>

        {renderActiveFilterChips(activeFilters, type)}
      </motion.div>
    );
  };

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto transition-all duration-300 ${refreshState === 'refreshing' ? 'opacity-40 blur-[2px] pointer-events-none' : 'opacity-100 blur-0'}`}>
      
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
              Unified intelligence administration, content moderation, live subject rooms, user controls, and audit logs.
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
              {refreshState === "refreshing" ? "Refreshing Data..." : refreshState === "success" ? "Data Updated!" : "Refresh View"}
            </span>
          </button>
        </div>
      </div>

      {/* Domain Navigation Rails */}
      <div className="space-y-3">
        {/* Level 1: Authoritative Domain Group Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--border)] hide-scrollbar">
          {ADMIN_INFORMATION_ARCHITECTURE.map((group) => {
            const GroupIcon = group.icon;
            const isGroupActive = currentGroup.id === group.id;

            let groupBadge = undefined;
            if (group.id === "ai_group") {
              const negCount = aiFeedback.filter(f => f.rating === 'negative' && f.admin_status !== 'resolved').length;
              if (negCount > 0) groupBadge = `${negCount} Alerts`;
            } else if (group.id === "users_access_group") {
              groupBadge = getMetricNumber(stats?.totalUsers, users.length);
            } else if (group.id === "community_live_group") {
              if (pendingTotal > 0) groupBadge = `${pendingTotal} Pending`;
            }

            return (
              <button
                key={group.id}
                onClick={() => setActiveTab(group.sections[0].id)}
                className={`flex items-center gap-2.5 px-4.5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 relative ${
                  isGroupActive
                    ? "text-white bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-[var(--border)]"
                }`}
              >
                <GroupIcon size={18} />
                <span>{group.label}</span>
                {groupBadge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isGroupActive ? "bg-white/20 text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"
                    }`}
                  >
                    {groupBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Level 2: Section Sub-Navigation Rail (Active when group contains multiple sections) */}
        {currentGroup.sections.length > 1 && (
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-x-auto hide-scrollbar">
            {currentGroup.sections.map((section) => {
              const SectionIcon = section.icon;
              const isSectionActive = activeTab === section.id;
              let sectionBadge = undefined;

              if (section.id === "models") sectionBadge = modelConfigs.length;
              if (section.id === "feedback") {
                const count = aiFeedback.filter(f => f.rating === 'negative' && f.admin_status !== 'resolved').length;
                if (count > 0) sectionBadge = count;
              }
              if (section.id === "website") sectionBadge = websiteLockSettings.is_locked ? "LOCKED" : "OPEN";
              if (section.id === "community") if (pendingTotal > 0) sectionBadge = `${pendingTotal} Pending`;
              if (section.id === "rooms") sectionBadge = getMetricNumber(stats?.totalRooms, rooms.length);

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSectionActive
                      ? "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <SectionIcon size={16} className={isSectionActive ? "text-indigo-400" : ""} />
                  <span>{section.label}</span>
                  {sectionBadge !== undefined && (
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      isSectionActive ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-[var(--card)] text-[var(--muted)] border border-[var(--border)]"
                    }`}>
                      {sectionBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div suppressHydrationWarning className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-4">
            {overviewMetrics.map((m, i) => (
              <div suppressHydrationWarning key={i} className={`p-4.5 rounded-2xl border ${m.bg} backdrop-blur-sm space-y-1`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{m.label}</span>
                <div suppressHydrationWarning className={`text-2xl font-extrabold ${m.color}`}>
                  {renderStatCount(m.metric, refreshState === "refreshing")}
                </div>
              </div>
            ))}
          </div>

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
                  onClick={() => setActiveTab("resources_moderation")}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-amber-400" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">Moderate Resource Submissions</span>
                  </div>
                  <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => {
                    setActiveTab("feedback");
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle size={18} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">Review AI Feedback & Quality</span>
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
                  View Full Audit Log &rarr;
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
                      <span suppressHydrationWarning className="text-[var(--muted)] font-mono shrink-0">
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
      {/* SECTION: CONTACT INBOX */}
      {activeTab === "contact_inbox" && (
        <ContactInboxTab 
          initialMessages={contactMessages} 
        />
      )}

      {/* SECTION: AI FEEDBACK */}
      {activeTab === "feedback" && (
        <div className="space-y-6">
          {/* Header & Sub-Tabs */}
          <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[var(--foreground)]">AI Feedback & Response Quality</h2>
                <p className="text-sm text-[var(--muted)] max-w-2xl mt-1 leading-relaxed">
                  Review authentic student ratings and exact message pairs to monitor Nexus AI output quality.
                </p>
              </div>
              
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-0">
                <button
                  onClick={() => setActiveFeedbackTab("negative")}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeFeedbackTab === "negative"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <ThumbsDown size={16} />
                  <span>Negative Feedback</span>
                  {aiFeedback.filter(f => f.rating === 'negative').length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {aiFeedback.filter(f => f.rating === 'negative').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveFeedbackTab("positive")}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeFeedbackTab === "positive"
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <ThumbsUp size={16} />
                  <span>Positive Feedback</span>
                  {aiFeedback.filter(f => f.rating === 'positive').length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {aiFeedback.filter(f => f.rating === 'positive').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* NEGATIVE FEEDBACK SUB-TAB */}
            {activeFeedbackTab === "negative" && (
              <div className="space-y-6 pt-2">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] p-3 rounded-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                      <input
                        type="text"
                        placeholder="Search feedback..."
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        className="w-[240px] h-10 pl-9 pr-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-indigo-500/50 outline-none text-xs font-medium text-[var(--foreground)]"
                      />
                    </div>
                    <select
                      value={feedbackStatusFilter}
                      onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                      className="h-10 px-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] outline-none text-xs font-semibold text-[var(--foreground)] cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="reported">Reported by User</option>
                      <option value="under_review">Under Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="unresolved">Unresolved (Reported + Review)</option>
                    </select>
                    <button
                      onClick={() => setShowAdvancedSearchNeg(prev => !prev)}
                      className={`h-10 px-4 rounded-xl font-bold text-xs transition-colors border flex items-center gap-2 ${
                        showAdvancedSearchNeg || activeFiltersNeg ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] border-[var(--border)]'
                      }`}
                    >
                      <Search size={14} />
                      Find Feedback
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {filteredAiFeedback.length > 0 && (
                      <>
                        <button
                          onClick={() => {
                            if (isSelectModeNeg) {
                              setIsSelectModeNeg(false);
                              clearSelectedNegative();
                            } else {
                              setIsSelectModeNeg(true);
                            }
                          }}
                          className={`h-10 px-4 rounded-xl font-bold text-xs border transition-colors ${
                            isSelectModeNeg ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          {isSelectModeNeg ? "Cancel Selection" : "Select"}
                        </button>
                        {isSelectModeNeg && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllNegative(visibleNegIds)}
                            className="h-10 px-3.5 rounded-xl font-bold text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={allVisibleNegSelected}
                              onChange={() => {}}
                              className="rounded border-[var(--border)] accent-indigo-500 cursor-pointer"
                            />
                            <span>{allVisibleNegSelected ? "Deselect All" : "Select All Visible"}</span>
                          </button>
                        )}
                      </>
                    )}

                    {isSelectModeNeg && selectedNegativeIds.length > 0 && (
                      <button
                        onClick={() => setConfirmDeleteFeedback({ type: 'selected_neg' })}
                        className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/20 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete Selected ({selectedNegativeIds.length})
                      </button>
                    )}

                    {aiFeedback.filter(f => f.rating === 'negative').length > 0 && !isSelectModeNeg && (
                      <button
                        onClick={() => setConfirmDeleteFeedback({ type: 'all_negative' })}
                        className="h-10 px-4 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 font-bold text-xs transition-colors border border-rose-500/20 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete All Negative
                      </button>
                    )}
                  </div>
                </div>

                {renderAdvancedSearchPanel("negative")}

                {/* Negative Feedback Grid / List */}
                {filteredAiFeedback.length === 0 ? (
                  <div className="py-16 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-2">
                    <ThumbsDown className="w-10 h-10 text-[var(--muted)]/40 mx-auto" />
                    <p className="text-sm font-semibold text-[var(--muted)]">No negative feedback records found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredAiFeedback.map((fb) => {
                      const isSelected = selectedNegativeIds.includes(fb.id);
                      const isExpanded = expandedNegFeedbackIds.includes(fb.id);
                      const meta = fb.users?.raw_user_meta_data || {};
                      const displayName = meta.display_name || meta.full_name || "Student";
                      const progBadge = meta.ib_program ? `${meta.ib_program}${meta.exam_session ? ` · ${meta.exam_session}` : ''}` : null;
                      const dateStr = new Date(fb.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      const timeStr = new Date(fb.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

                      const promptPreview = (fb.prompt || "No prompt recorded").replace(/\n+/g, ' ');
                      const responsePreview = (fb.ai_response || fb.ai_messages?.content || "No AI response recorded").replace(/\n+/g, ' ');
                      const avatarUrl = meta.avatar_url || fb.user_avatar || fb.avatar_url;

                      if (isExpanded) {
                        return (
                          <div
                            key={fb.id}
                            className={`p-6 rounded-3xl border transition-all space-y-4 ${
                              isSelected
                                ? 'bg-indigo-500/5 border-indigo-500/40 shadow-md'
                                : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)]'
                            }`}
                          >
                            {/* USER IDENTITY HEADER */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                              <div className="flex items-center gap-3">
                                {isSelectModeNeg && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectNegative(fb.id)}
                                    className="rounded border-[var(--border)] accent-indigo-500 cursor-pointer w-4 h-4"
                                  />
                                )}
                                {renderUserAvatar(avatarUrl, displayName)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-[var(--foreground)]">
                                      {displayName}
                                    </span>
                                    {progBadge && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        {progBadge}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-[var(--muted)]">{fb.users?.email}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-xs font-mono text-[var(--muted)]">
                                <span>{dateStr} · {timeStr}</span>
                                <button
                                  onClick={() => toggleExpandNegativeFeedback(fb.id)}
                                  className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-1.5"
                                >
                                  <EyeOff size={14} /> Hide Details
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteFeedback({ type: 'single', id: fb.id })}
                                  className="p-1.5 rounded-xl hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400 transition-colors"
                                  title="Delete report"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* 1. USER QUESTION / PROMPT */}
                            <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">USER QUESTION / PROMPT</span>
                              <p className="text-xs font-medium text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                "{fb.prompt || "No prompt recorded"}"
                              </p>
                            </div>

                            {/* 2. AI RESPONSE */}
                            <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">AI RESPONSE</span>
                                {(fb.model_display_name || fb.model_id) && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                    {fb.model_display_name || fb.model_id}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                "{fb.ai_response || fb.ai_messages?.content || "No AI response recorded"}"
                              </p>
                            </div>

                            {/* 3. FEEDBACK REASON */}
                            <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">FEEDBACK REASON</span>
                              <p className="text-xs font-bold text-[var(--foreground)]">
                                {fb.category || "No category specified"}
                              </p>
                            </div>

                            {/* 4. USER COMMENT (Only if one actually exists) */}
                            {fb.comment && fb.comment.trim().length > 0 && (
                              <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">USER COMMENT</span>
                                <p className="text-xs font-medium text-[var(--foreground)] italic leading-relaxed">
                                  "{fb.comment.trim()}"
                                </p>
                              </div>
                            )}

                            {/* 5. STATUS & ADMIN NOTE ACTIONS */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)] text-xs">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-[var(--muted)] tracking-wider">Status:</span>
                                <select
                                  value={fb.admin_status || "reported"}
                                  onChange={(e) => handleUpdateFeedbackStatus(fb.id, e.target.value)}
                                  className={`px-3 py-1 rounded-xl text-xs font-black border outline-none cursor-pointer ${
                                    fb.admin_status === "resolved"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : fb.admin_status === "under_review"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  }`}
                                >
                                  <option value="reported">Reported by User</option>
                                  <option value="under_review">Under Review</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              </div>

                              <button
                                onClick={() => {
                                  setEditingNoteModal(fb);
                                  setNoteInputText(fb.admin_note || "");
                                }}
                                className="text-xs font-bold text-indigo-400 hover:underline"
                              >
                                {fb.admin_note ? `Note: ${fb.admin_note}` : "+ Add Admin Note"}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      {/* MINIMIZED CARD VIEW */}
                      return (
                        <div
                          key={fb.id}
                          className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                            isSelected
                              ? 'bg-indigo-500/5 border-indigo-500/40 shadow-sm'
                              : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* USER DP + NAME + PROGRAMME + DATE/TIME */}
                            <div className="flex items-center gap-3 min-w-0">
                              {isSelectModeNeg && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectNegative(fb.id)}
                                  className="rounded border-[var(--border)] accent-indigo-500 cursor-pointer w-4 h-4 shrink-0"
                                />
                              )}
                              {renderUserAvatar(avatarUrl, displayName)}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-[var(--foreground)] truncate">
                                    {displayName}
                                  </span>
                                  {progBadge && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                                      {progBadge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[var(--muted)] font-mono block truncate">
                                  {dateStr} · {timeStr}
                                </span>
                              </div>
                            </div>

                            {/* ACTIONS: VIEW DETAILS + DELETE */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <button
                                onClick={() => toggleExpandNegativeFeedback(fb.id)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-1.5"
                              >
                                <Eye size={14} /> View Details
                              </button>
                              <button
                                onClick={() => setConfirmDeleteFeedback({ type: 'single', id: fb.id })}
                                className="p-1.5 rounded-xl hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400 transition-colors"
                                title="Delete report"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* SHORT PREVIEWS: USER QUESTION & AI RESPONSE */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                            <div className="flex items-center gap-1.5 min-w-0 bg-[var(--surface)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                              <span className="text-[10px] font-black uppercase text-[var(--muted)] shrink-0">Q:</span>
                              <span className="text-[var(--foreground)] text-xs truncate italic">
                                "{promptPreview}"
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 bg-rose-500/5 px-3 py-1.5 rounded-xl border border-rose-500/15">
                              <span className="text-[10px] font-black uppercase text-rose-400 shrink-0">AI:</span>
                              <span className="text-[var(--foreground)] text-xs truncate italic">
                                "{responsePreview}"
                              </span>
                            </div>
                          </div>

                          {/* FOOTER BADGES: REASON, MODEL & STATUS */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Reason: {fb.category || "General"}
                              </span>
                              {(fb.model_display_name || fb.model_id) && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                  {fb.model_display_name || fb.model_id}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                                fb.admin_status === "resolved"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : fb.admin_status === "under_review"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}>
                                {fb.admin_status === "resolved" ? "Resolved" : fb.admin_status === "under_review" ? "Under Review" : "Reported"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* POSITIVE FEEDBACK SUB-TAB */}
            {activeFeedbackTab === "positive" && (
              <div className="space-y-6 pt-2">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                      <input
                        type="text"
                        placeholder="Search positive signals..."
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        className="w-[240px] h-10 pl-9 pr-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-indigo-500/50 outline-none text-xs font-medium text-[var(--foreground)]"
                      />
                    </div>
                    <button
                      onClick={() => setShowAdvancedSearchPos(prev => !prev)}
                      className={`h-10 px-4 rounded-xl font-bold text-xs transition-colors border flex items-center gap-2 ${
                        showAdvancedSearchPos || activeFiltersPos ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] border-[var(--border)]'
                      }`}
                    >
                      <Search size={14} />
                      Find Feedback
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {positiveItems.length > 0 && (
                      <>
                        <button
                          onClick={() => {
                            if (isSelectModePos) {
                              setIsSelectModePos(false);
                              clearSelectedPositive();
                            } else {
                              setIsSelectModePos(true);
                            }
                          }}
                          className={`h-10 px-4 rounded-xl font-bold text-xs border transition-colors ${
                            isSelectModePos ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          {isSelectModePos ? "Cancel Selection" : "Select"}
                        </button>
                        {isSelectModePos && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllPositive(visiblePosIds)}
                            className="h-10 px-3.5 rounded-xl font-bold text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={allVisiblePosSelected}
                              onChange={() => {}}
                              className="rounded border-[var(--border)] accent-indigo-500 cursor-pointer"
                            />
                            <span>{allVisiblePosSelected ? "Deselect All" : "Select All Visible"}</span>
                          </button>
                        )}
                      </>
                    )}

                    {isSelectModePos && selectedPositiveIds.length > 0 && (
                      <button
                        onClick={() => setConfirmDeleteFeedback({ type: 'selected_pos' })}
                        className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/20 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete Selected ({selectedPositiveIds.length})
                      </button>
                    )}

                    {aiFeedback.filter(f => f.rating === 'positive').length > 0 && !isSelectModePos && (
                      <button
                        onClick={() => setConfirmDeleteFeedback({ type: 'all_positive' })}
                        className="h-10 px-4 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 font-bold text-xs transition-colors border border-rose-500/20 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete All Positive
                      </button>
                    )}
                  </div>
                </div>

                {renderAdvancedSearchPanel("positive")}

                {/* Positive Signals Grid */}
                {positiveItems.length === 0 ? (
                  <div className="py-16 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-2">
                    <ThumbsUp className="w-10 h-10 text-[var(--muted)]/40 mx-auto" />
                    <p className="text-sm font-semibold text-[var(--muted)]">No positive feedback signals recorded.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {positiveItems.map((fb) => {
                      const isSelectedPos = selectedPositiveIds.includes(fb.id);
                      const isExpanded = expandedPosFeedbackIds.includes(fb.id);
                      const meta = fb.users?.raw_user_meta_data || {};
                      const displayName = meta.display_name || meta.full_name || "Student";
                      const progBadge = meta.ib_program ? `${meta.ib_program}${meta.exam_session ? ` · ${meta.exam_session}` : ''}` : null;
                      const dateStr = new Date(fb.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      const timeStr = new Date(fb.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

                      const promptPreview = (fb.prompt || "No prompt recorded").replace(/\n+/g, ' ');
                      const responsePreview = (fb.ai_response || fb.ai_messages?.content || "No AI response recorded").replace(/\n+/g, ' ');
                      const avatarUrl = meta.avatar_url || fb.user_avatar || fb.avatar_url;

                      if (isExpanded) {
                        return (
                          <div
                            key={fb.id}
                            className={`p-6 rounded-3xl border transition-all space-y-4 ${
                              isSelectedPos
                                ? 'bg-indigo-500/5 border-indigo-500/40 shadow-md'
                                : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)]'
                            }`}
                          >
                            {/* USER IDENTITY HEADER */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                              <div className="flex items-center gap-3">
                                {isSelectModePos && (
                                  <input
                                    type="checkbox"
                                    checked={isSelectedPos}
                                    onChange={() => handleToggleSelectPositive(fb.id)}
                                    className="rounded border-[var(--border)] accent-indigo-500 cursor-pointer w-4 h-4"
                                  />
                                )}
                                {renderUserAvatar(avatarUrl, displayName)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-[var(--foreground)]">
                                      {displayName}
                                    </span>
                                    {progBadge && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        {progBadge}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-[var(--muted)]">{fb.users?.email}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-xs font-mono text-[var(--muted)]">
                                <span>{dateStr} · {timeStr}</span>
                                <button
                                  onClick={() => toggleExpandPositiveFeedback(fb.id)}
                                  className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-1.5"
                                >
                                  <EyeOff size={14} /> Hide Details
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteFeedback({ type: 'single', id: fb.id })}
                                  className="p-1.5 rounded-xl hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400 transition-colors"
                                  title="Delete positive report"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* USER QUESTION / PROMPT */}
                            <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">USER QUESTION / PROMPT</span>
                              <p className="text-xs font-medium text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                "{fb.prompt || "No prompt recorded"}"
                              </p>
                            </div>

                            {/* AI RESPONSE */}
                            <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">AI RESPONSE</span>
                                {(fb.model_display_name || fb.model_id) && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                    {fb.model_display_name || fb.model_id}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                "{fb.ai_response || fb.ai_messages?.content || "No AI response recorded"}"
                              </p>
                            </div>

                            {/* FOOTER BADGES */}
                            <div className="flex items-center justify-between pt-1 text-xs">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ThumbsUp size={14} /> Liked Output
                              </span>
                              {fb.comment && (
                                <span className="text-xs text-[var(--muted)] italic">
                                  User Comment: "{fb.comment}"
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      {/* MINIMIZED CARD VIEW */}
                      return (
                        <div
                          key={fb.id}
                          className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                            isSelectedPos
                              ? 'bg-indigo-500/5 border-indigo-500/40 shadow-sm'
                              : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* USER DP + NAME + PROGRAMME + DATE/TIME */}
                            <div className="flex items-center gap-3 min-w-0">
                              {isSelectModePos && (
                                <input
                                  type="checkbox"
                                  checked={isSelectedPos}
                                  onChange={() => handleToggleSelectPositive(fb.id)}
                                  className="rounded border-[var(--border)] accent-indigo-500 cursor-pointer w-4 h-4 shrink-0"
                                />
                              )}
                              {renderUserAvatar(avatarUrl, displayName)}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-[var(--foreground)] truncate">
                                    {displayName}
                                  </span>
                                  {progBadge && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                                      {progBadge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[var(--muted)] font-mono block truncate">
                                  {dateStr} · {timeStr}
                                </span>
                              </div>
                            </div>

                            {/* ACTIONS: VIEW DETAILS + DELETE */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <button
                                onClick={() => toggleExpandPositiveFeedback(fb.id)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-1.5"
                              >
                                <Eye size={14} /> View Details
                              </button>
                              <button
                                onClick={() => setConfirmDeleteFeedback({ type: 'single', id: fb.id })}
                                className="p-1.5 rounded-xl hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400 transition-colors"
                                title="Delete positive report"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* SHORT PREVIEWS: USER QUESTION & AI RESPONSE */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                            <div className="flex items-center gap-1.5 min-w-0 bg-[var(--surface)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                              <span className="text-[10px] font-black uppercase text-[var(--muted)] shrink-0">Q:</span>
                              <span className="text-[var(--foreground)] text-xs truncate italic">
                                "{promptPreview}"
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 bg-indigo-500/5 px-3 py-1.5 rounded-xl border border-indigo-500/15">
                              <span className="text-[10px] font-black uppercase text-indigo-400 shrink-0">AI:</span>
                              <span className="text-[var(--foreground)] text-xs truncate italic">
                                "{responsePreview}"
                              </span>
                            </div>
                          </div>

                          {/* FOOTER BADGES: MODEL & LIKED STATUS */}
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ThumbsUp size={12} /> Liked
                              </span>
                              {(fb.model_display_name || fb.model_id) && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  {fb.model_display_name || fb.model_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: USERS */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await fetchAdminUsers({ search: userSearch, statusFilter: userStatusFilter, programFilter: userProgramFilter });
                  if (res.users) setUsers(res.users);
                });
              }}
              className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg"
            >
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

            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
              <select
                value={userProgramFilter}
                onChange={(e) => {
                  setUserProgramFilter(e.target.value);
                  startTransition(async () => {
                    const res = await fetchAdminUsers({ search: userSearch, statusFilter: userStatusFilter, programFilter: e.target.value });
                    if (res.users) setUsers(res.users);
                  });
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] cursor-pointer"
              >
                <option value="all">All Programs</option>
                <option value="dp">DP Program</option>
                <option value="myp">MYP Program</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  startTransition(async () => {
                    const res = await fetchAdminUsers({ search: userSearch, statusFilter: e.target.value, programFilter: userProgramFilter });
                    if (res.users) setUsers(res.users);
                  });
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] cursor-pointer"
              >
                <option value="all">All Account Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>

          <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
                  <tr>
                    <th className="p-4 pl-6">User / Account</th>
                    <th className="p-4">Program / Session</th>
                    <th className="p-4">Access Status</th>
                    <th className="p-4">Role</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[var(--muted)] text-xs">No users found.</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleInspectUser(u)}>
                            {renderUserAvatar(u.avatar_url, u.display_name || u.full_name)}
                            <div>
                              <p className="font-bold text-[var(--foreground)] hover:underline flex items-center gap-1.5">
                                <span>{u.display_name || u.full_name || "User"}</span>
                                {u.is_suspended ? (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    Suspended
                                  </span>
                                ) : u.is_restricted ? (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Comments Muted
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-xs text-[var(--muted)] font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-xs text-[var(--muted)]">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {u.ib_program ? u.ib_program.toUpperCase() : "DP"}
                          </span>
                          {u.exam_session && <span className="block text-[11px] text-[var(--muted)] mt-1 font-mono">{u.exam_session}</span>}
                        </td>
                        <td className="p-4">
                          {u.is_suspended ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                              <ShieldAlert size={12} /> Suspended
                            </span>
                          ) : u.is_restricted ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                              <Lock size={12} /> Comments Muted
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                              <ShieldCheck size={12} /> Full Access
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {u.is_admin ? (
                            (superAdminEmail && u.email?.trim().toLowerCase() === superAdminEmail) ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                                Super Admin
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                Administrator
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-[var(--muted)]">Student</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right space-x-1.5 shrink-0">
                          <button
                            onClick={() => handleInspectUser(u)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] text-xs font-bold border border-[var(--border)] transition-colors inline-flex items-center gap-1"
                            title="Inspect User Details & Data Stats"
                          >
                            <Eye size={13} /> Inspect
                          </button>

                          <button
                            onClick={() => handleEditUserClick(u)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] text-xs font-bold border border-[var(--border)] transition-colors inline-flex items-center gap-1"
                            title="Edit User Profile & Permissions"
                          >
                            <Edit3 size={13} /> Edit
                          </button>

                          {u.is_suspended ? (
                            <button
                              onClick={() => handleUnsuspendUser(u)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-colors inline-flex items-center gap-1"
                              title="Unsuspend user and restore full website access"
                            >
                              <ShieldCheck size={13} /> Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspendUser(u)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors inline-flex items-center gap-1 ${
                                isProtectedAccount(u)
                                  ? "bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border-slate-500/30 cursor-pointer"
                                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                              }`}
                              title={
                                isProtectedAccount(u)
                                  ? "Super Admin Protected — Account cannot be suspended"
                                  : "Suspend User (Locks website access; all data preserved safely)"
                              }
                            >
                              {isProtectedAccount(u) ? <ShieldAlert size={13} className="text-amber-400" /> : <Lock size={13} />}
                              Suspend
                              {isProtectedAccount(u) && (
                                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold">Protected</span>
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUserAccount(u)}
                            className={`p-1.5 rounded-xl transition-colors inline-flex items-center justify-center ${
                              isProtectedAccount(u)
                                ? "hover:bg-slate-500/10 text-slate-400 cursor-pointer"
                                : "hover:bg-rose-500/10 text-rose-400"
                            }`}
                            title={
                              isProtectedAccount(u)
                                ? "Super Admin Protected — Account cannot be deleted"
                                : "Permanently Delete User Account & Wipe All Data"
                            }
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* SECTION: COMMUNITY MODERATION */}
      {activeTab === "community" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search community posts & discussions..."
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={communityContentType}
                onChange={(e) => setCommunityContentType(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)]"
              >
                <option value="all">All Content Types</option>
                <option value="discussion">Discussions</option>
                <option value="question">Questions</option>
                <option value="study_group">Study Groups</option>
                <option value="report">User Reports</option>
              </select>

              <select
                value={communityStatusFilter}
                onChange={(e) => setCommunityStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)]"
              >
                <option value="all">All Moderation Items</option>
                <option value="pending">Pending Approval</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunityItems.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm text-[var(--muted)] bg-[var(--card)] border border-[var(--border)] rounded-3xl">
                No community content matching selected filters.
              </div>
            ) : (
              filteredCommunityItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItemDrawer(item)}
                  className="p-5 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-4 flex flex-col justify-between hover:border-[var(--accent)] hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.contentType === "report" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {item.contentType || "Post"}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        item.status === "pending" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse" : item.status === "approved" || item.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {item.status ? item.status.toUpperCase() : "ACTIVE"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-[var(--foreground)] line-clamp-2 group-hover:text-indigo-400 transition-colors">{item.title}</h3>
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-3 leading-relaxed">{item.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs">
                    <span className="text-[var(--muted)] font-semibold">By {item.author_name || "User"}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenItemDrawer(item);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[var(--surface)] group-hover:bg-[var(--accent)] group-hover:text-white hover:bg-[var(--surface-hover)] text-[var(--foreground)] font-bold border border-[var(--border)] flex items-center gap-1 transition-all"
                    >
                      <span>Moderate</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION: LIVE ROOMS */}
      {activeTab === "rooms" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Live Subject Rooms</h2>
              <p className="text-sm text-[var(--muted)] mt-0.5">Manage virtual rooms for IB subject collaboration and moderation.</p>
            </div>
            <button
              onClick={() => setRoomModal({ mode: "create" })}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-bold shadow-lg shadow-[var(--accent)]/20 flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus size={18} />
              <span>Create Live Room</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm text-[var(--muted)] bg-[var(--card)] border border-[var(--border)] rounded-3xl">
                No live rooms created yet.
              </div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-4 flex flex-col justify-between hover:border-[var(--border-hover)] transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {room.subject || "General"}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${room.is_active !== false ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {room.is_active !== false ? "ACTIVE" : "PAUSED"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-lg text-[var(--foreground)]">{room.name}</h3>
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2 leading-relaxed">{room.description || "No description."}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => handleInspectRoom(room)}
                      className="px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold border border-indigo-500/20 flex items-center gap-1.5"
                    >
                      <ShieldCheck size={15} />
                      <span>Moderate Chat</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button onClick={() => setRoomModal({ mode: "edit", room })} className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)]">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDeleteRoom(room)} className="p-2 rounded-xl hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION: COURSE CATALOG */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Course & Subject Catalog</h2>
              <p className="text-sm text-[var(--muted)] mt-0.5">Manage official IB DP and MYP subjects and academic curriculum rules.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSeedCatalog}
                disabled={isSeedingSubjects}
                className="px-4 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] flex items-center gap-2"
              >
                {isSeedingSubjects ? <RefreshCw size={14} className="animate-spin" /> : <BookOpen size={14} />}
                <span>Sync Official Catalog</span>
              </button>

              <button
                onClick={() => setSubjectModal({ mode: "create", program: "dp" })}
                className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold shadow-lg shadow-[var(--accent)]/20 flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Add Subject</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm text-[var(--muted)] bg-[var(--card)] border border-[var(--border)] rounded-3xl">
                No subjects registered in catalog.
              </div>
            ) : (
              subjects.map((sub) => (
                <div key={sub.id} className="p-5 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {sub.program ? sub.program.toUpperCase() : "DP"}
                      </span>
                      <span className="text-xs font-bold text-[var(--muted)]">{sub.category}</span>
                    </div>

                    <h3 className="font-extrabold text-base text-[var(--foreground)]">{sub.name}</h3>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs">
                    <span className="font-mono text-[var(--muted)]">
                      {sub.available_levels ? JSON.parse(typeof sub.available_levels === 'string' ? sub.available_levels : JSON.stringify(sub.available_levels)).join('/') : 'SL/HL'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSubjectModal({ mode: "edit", subject: sub, program: sub.program || "dp" })} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)]">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDeleteSubjectClick(sub.id, sub.name)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION: RESOURCE SUBMISSIONS MODERATION */}
      {activeTab === "resources_moderation" && (
        <ResourceSubmissionsTab />
      )}

      {/* SECTION: CENTRAL ADMIN REQUESTS */}
      {activeTab === "admin_requests" && (
        <AdminRequestsTab />
      )}

      {/* SECTION: AI MODELS */}
      {activeTab === "models" && (
        <AiModelsTab initialModelConfigs={modelConfigs} />
      )}

      {/* SECTION: NEXUS AI CORE */}
      {activeTab === "aicore" && (
        <AiCoreTab initialCoreVersions={initialCoreVersions} />
      )}

      {/* SECTION: WEBSITE ACCESS */}
      {activeTab === "website" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Website Access Lock</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Restrict platform access to designated email allowlists during maintenance or private launch.</p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${websiteLockSettings.is_locked ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"}`}>
                  {websiteLockSettings.is_locked ? "WEBSITE LOCKED" : "WEBSITE OPEN"}
                </span>

                {websiteLockSettings.is_locked ? (
                  <button
                    onClick={() => handleToggleWebsiteLock(false)}
                    disabled={isUpdatingLock}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                  >
                    Unlock Website
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleWebsiteLock(true)}
                    disabled={isUpdatingLock}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
                  >
                    Lock Website
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase text-[var(--muted)]">Lock Notice Banner</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={lockMessageInput}
                  onChange={(e) => setLockMessageInput(e.target.value)}
                  placeholder="e.g. Platform is undergoing scheduled maintenance..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]"
                />
                <button
                  onClick={handleSaveLockMessage}
                  disabled={isUpdatingLock}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-xs shadow-md"
                >
                  Save Notice
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-6">
            <h3 className="text-lg font-bold text-[var(--foreground)]">Google Account Access Allowlist</h3>

            <form onSubmit={handleAddAllowlist} className="flex gap-3 max-w-lg">
              <input
                type="email"
                value={newAllowlistEmail}
                onChange={(e) => setNewAllowlistEmail(e.target.value)}
                placeholder="Enter Google account email..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]"
              />
              <button
                type="submit"
                disabled={isAddingAllowlist}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shrink-0"
              >
                Add Email
              </button>
            </form>

            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3 pl-4">Allowed Email</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {allowlist.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-xs text-[var(--muted)]">No emails on allowlist.</td>
                    </tr>
                  ) : (
                    allowlist.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 pl-4 font-semibold text-[var(--foreground)] flex items-center gap-2">
                          <span>{item.email}</span>
                          {isTargetSuperAdmin(item.email) && (
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                              Super Admin (Protected)
                            </span>
                          )}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <button
                            onClick={() => handleRemoveAllowlist(item.id, item.email)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isTargetSuperAdmin(item.email)
                                ? "hover:bg-slate-500/10 text-slate-400 cursor-pointer"
                                : "hover:bg-rose-500/10 text-rose-400"
                            }`}
                            title={
                              isTargetSuperAdmin(item.email)
                                ? "Super Admin Protected — Email cannot be removed from allowlist"
                                : "Remove from allowlist"
                            }
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* SECTION: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Activity Moderation Audit Trail</h2>
              <p className="text-sm text-[var(--muted)] mt-0.5">Full historical audit record of all administrator and moderator actions.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmClearLogsModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20"
              >
                Clear Audit Trail
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="p-4 pl-6">Action / Event</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[var(--muted)]">No audit entries.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="p-4 pl-6 font-semibold text-[var(--foreground)]">
                        {log.details || log.action}
                      </td>
                      <td className="p-4 text-xs text-[var(--muted)]">
                        {log.actor_email || "Admin"}
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--muted)]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => setLogDetailModal(log)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] text-xs font-bold border border-[var(--border)]"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MODEL CONFIG */}
      <AnimatePresence>
        {editingModelModal && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6">
            <div onClick={() => setEditingModelModal(null)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-6 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-[var(--foreground)]">Configure AI Model Parameters</h3>
                <button type="button" onClick={() => setEditingModelModal(null)} className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)]"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveModelMetadataSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm border border-[var(--border)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm border border-[var(--border)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                  <button type="button" onClick={() => setEditingModelModal(null)} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingModelEdit} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                    {isSubmittingModelEdit && <RefreshCw size={14} className="animate-spin" />}
                    <span>Save Model Details</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT ADMIN NOTE ON FEEDBACK */}
      <AnimatePresence>
        {editingNoteModal && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6">
            <div onClick={() => setEditingNoteModal(null)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="relative w-full max-w-md my-auto max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-4 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--foreground)]">Admin Feedback Internal Note</h3>
                <button type="button" onClick={() => setEditingNoteModal(null)} className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)]"><X size={18} /></button>
              </div>

              <textarea
                rows={4}
                value={noteInputText}
                onChange={(e) => setNoteInputText(e.target.value)}
                placeholder="Add internal notes for moderators/admins regarding this report..."
                className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingNoteModal(null)} className="px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveAdminNote} disabled={isPending} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md">
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: GENERIC CONFIRMATION */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
            <div onClick={() => setConfirmModal(null)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-6 z-10">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-extrabold text-[var(--foreground)]">{confirmModal.title}</h3>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={() => setConfirmModal(null)} className="px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const fn = confirmModal.actionFn;
                    setConfirmModal(null);
                    if (fn) await fn();
                  }}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
                >
                  {confirmModal.dangerText || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: USER INSPECTION DRAWER */}
      <AnimatePresence>
        {userDrawer && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUserDrawer(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-xl p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-6 z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  {renderUserAvatar(userDrawer.user?.avatar_url, userDrawer.user?.display_name || userDrawer.user?.full_name)}
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--foreground)]">
                      {userDrawer.user?.display_name || userDrawer.user?.full_name || "User Inspection"}
                    </h3>
                    <p className="text-xs text-[var(--muted)] font-mono">{userDrawer.user?.email}</p>
                  </div>
                </div>
                <button onClick={() => setUserDrawer(null)} className="p-1.5 hover:bg-[var(--surface)] rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X size={20} />
                </button>
              </div>

              {userDrawer.loading ? (
                <div className="py-12 text-center text-xs text-[var(--muted)] space-y-2">
                  <RefreshCw size={24} className="animate-spin mx-auto text-indigo-400" />
                  <p>Loading full user analytics & data stats...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* USER BADGES & METADATA GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Status</span>
                      <p className="font-bold">
                        {userDrawer.user?.is_suspended ? (
                          <span className="text-rose-400">Suspended</span>
                        ) : userDrawer.user?.is_restricted ? (
                          <span className="text-amber-400">Comments Muted</span>
                        ) : (
                          <span className="text-emerald-400">Active</span>
                        )}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Program</span>
                      <p className="font-bold text-indigo-400">
                        {userDrawer.user?.ib_program ? userDrawer.user.ib_program.toUpperCase() : "DP"}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Role</span>
                      <p className="font-bold text-purple-400">
                        {userDrawer.user?.is_admin ? (superAdminEmail && userDrawer.user?.email?.trim().toLowerCase() === superAdminEmail ? "Super Admin" : "Admin") : "Student"}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Exam Session</span>
                      <p className="font-bold text-[var(--foreground)] truncate">
                        {userDrawer.user?.exam_session || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* PLATFORM USAGE STATS */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Platform Usage & Activity Stats</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                        <span className="text-xl font-black text-indigo-400 block">{userStats?.notesCount || 0}</span>
                        <span className="text-[10px] font-extrabold uppercase text-[var(--muted)]">Notes Created</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                        <span className="text-xl font-black text-purple-400 block">{userStats?.conversationsCount || 0}</span>
                        <span className="text-[10px] font-extrabold uppercase text-[var(--muted)]">AI Chats</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-xl font-black text-emerald-400 block">{userStats?.communityPostsCount || 0}</span>
                        <span className="text-[10px] font-extrabold uppercase text-[var(--muted)]">Posts</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                        <span className="text-xl font-black text-amber-400 block">{userStats?.aiFeedbackCount || 0}</span>
                        <span className="text-[10px] font-extrabold uppercase text-[var(--muted)]">Feedback</span>
                      </div>
                    </div>
                  </div>

                  {/* USER DATES & TIMESTAMPS */}
                  <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2 text-xs font-mono text-[var(--muted)]">
                    <div className="flex justify-between">
                      <span>User ID:</span>
                      <span className="text-[var(--foreground)] select-all">{userDrawer.user?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Joined Date:</span>
                      <span className="text-[var(--foreground)]">{userDrawer.user?.created_at ? new Date(userDrawer.user.created_at).toLocaleString() : "N/A"}</span>
                    </div>
                    {userDrawer.user?.last_sign_in_at && (
                      <div className="flex justify-between">
                        <span>Last Sign In:</span>
                        <span className="text-[var(--foreground)]">{new Date(userDrawer.user.last_sign_in_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* DRAWER ACTION CONTROLS */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => handleEditUserClick(userDrawer.user)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 size={14} /> Edit Profile & Role
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {userDrawer.user?.is_suspended ? (
                        <button
                          onClick={() => handleUnsuspendUser(userDrawer.user)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1.5"
                          title="Restore website access (user data safely preserved)"
                        >
                          <ShieldCheck size={14} /> Unsuspend Account
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspendUser(userDrawer.user)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                            isProtectedAccount(userDrawer.user)
                              ? "bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border-slate-500/30 cursor-pointer"
                              : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
                          }`}
                          title={
                            isProtectedAccount(userDrawer.user)
                              ? "Super Admin Protected — Account cannot be suspended"
                              : "Suspend Account (Locks website access; all data preserved safely)"
                          }
                        >
                          {isProtectedAccount(userDrawer.user) ? <ShieldAlert size={14} className="text-amber-400" /> : <Lock size={14} />}
                          Suspend Account
                          {isProtectedAccount(userDrawer.user) && (
                            <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold">Protected</span>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleRestrictComments(userDrawer.user)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                          userDrawer.user?.is_restricted
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
                            : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border-[var(--border)]"
                        }`}
                        title="Toggle comment and forum message restrictions"
                      >
                        <MessageSquare size={13} />
                        {userDrawer.user?.is_restricted ? "Unmute Comments" : "Mute Comments"}
                      </button>

                      <button
                        onClick={() => handleDeleteUserAccount(userDrawer.user)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                          isProtectedAccount(userDrawer.user)
                            ? "bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border-slate-500/20 cursor-pointer"
                            : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
                        }`}
                        title={
                          isProtectedAccount(userDrawer.user)
                            ? "Super Admin Protected — Account cannot be deleted"
                            : "Permanently Delete User Account & Wipe All Data"
                        }
                      >
                        <Trash2 size={14} /> Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT USER PROFILE BY ADMIN */}
      <AnimatePresence>
        {editingUserModal && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingUserModal(null)} className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-5 z-10 my-auto">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-lg font-extrabold text-[var(--foreground)]">Edit User Account & Permissions</h3>
                <button onClick={() => setEditingUserModal(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveUserEditSubmit} className="space-y-4 text-xs">
                {userSaveBanner && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs font-medium leading-relaxed ${
                      userSaveBanner.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {userSaveBanner.type === "success" ? (
                      <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-xs mb-0.5">
                        {userSaveBanner.type === "success" ? "User Profile Updated" : "Update Failed"}
                      </p>
                      <p>{userSaveBanner.message}</p>
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Email (Read-only)</label>
                  <input type="text" disabled value={editingUserModal.email || ""} className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] cursor-not-allowed" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Display Name</label>
                    <input type="text" required value={editUserDisplayName} onChange={(e) => setEditUserDisplayName(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Full Name</label>
                    <input type="text" value={editUserFullName} onChange={(e) => setEditUserFullName(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">IB Program</label>
                    <select value={editUserProgram} onChange={(e) => setEditUserProgram(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 cursor-pointer">
                      <option value="DP">DP (Diploma Programme)</option>
                      <option value="MYP">MYP (Middle Years Programme)</option>
                      <option value="None">Unassigned / None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Exam Session</label>
                    <input type="text" placeholder="e.g. May 2026" value={editUserExamSession} onChange={(e) => setEditUserExamSession(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserIsAdmin}
                      onChange={(e) => {
                        if (isProtectedAccount(editingUserModal) && !e.target.checked) {
                          showToast("Action Prohibited: Super Admin administrative privileges cannot be revoked.", "error");
                          return;
                        }
                        setEditUserIsAdmin(e.target.checked);
                      }}
                      className="rounded border-[var(--border)] accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-extrabold text-sm text-[var(--foreground)]">Grant Designated Admin Privileges</span>
                    {isProtectedAccount(editingUserModal) && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        Super Admin Locked
                      </span>
                    )}
                  </label>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    {isProtectedAccount(editingUserModal)
                      ? "This is the Super Admin account. Administrative privileges are permanent and cannot be modified or revoked."
                      : "Admins can manage platform users, moderation flags, AI core constitution, model parameter configs, and live room controls."}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                  <button type="button" onClick={() => setEditingUserModal(null)} className="px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSavingUserEdit || isPending} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2">
                    {isSavingUserEdit && <RefreshCw size={14} className="animate-spin" />}
                    <span>Save User Profile</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: COMMUNITY ITEM & POST INSPECTION / MODERATION DRAWER */}
      <AnimatePresence>
        {itemDrawer && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemDrawer(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl my-auto p-6 sm:p-8 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-6 z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* HEADER WITH BADGES & CLOSE */}
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      itemDrawer.item.contentType === "report"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                        : itemDrawer.item.contentType === "question"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25"
                    }`}>
                      {itemDrawer.item.contentType ? itemDrawer.item.contentType.toUpperCase() : "POST"}
                    </span>

                    <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 ${
                      itemDrawer.item.status === "pending"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                        : itemDrawer.item.status === "approved" || itemDrawer.item.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}>
                      {itemDrawer.item.status === "approved" || itemDrawer.item.status === "active" ? (
                        <CheckCircle2 size={13} />
                      ) : itemDrawer.item.status === "pending" ? (
                        <Clock size={13} />
                      ) : (
                        <XCircle size={13} />
                      )}
                      <span>{itemDrawer.item.status ? itemDrawer.item.status.toUpperCase() : "ACTIVE"}</span>
                    </span>

                    {itemDrawer.item.category && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                        {itemDrawer.item.category}
                      </span>
                    )}

                    {itemDrawer.item.is_answered && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        SOLVED
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight break-words">
                    {itemDrawer.item.title || "Untitled Community Item"}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {itemDrawer.item.contentType !== "report" && itemDrawer.item.contentType !== "study_group" && (
                    <Link
                      href={`/dashboard/community/${itemDrawer.item.id}`}
                      target="_blank"
                      className="p-2 hover:bg-[var(--surface)] rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="Open full page in community"
                    >
                      <ExternalLink size={17} />
                      <span className="hidden sm:inline">Live Post</span>
                    </Link>
                  )}
                  <button
                    onClick={() => setItemDrawer(null)}
                    className="p-2 hover:bg-[var(--surface)] rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* AUTHOR & METADATA BAR */}
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  {renderUserAvatar(itemDrawer.item.author_avatar, itemDrawer.item.author_name)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[var(--foreground)] text-sm">
                        {itemDrawer.item.author_name || "Community Author"}
                      </span>
                      {itemDrawer.item.author_role && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-400">
                          {itemDrawer.item.author_role}
                        </span>
                      )}
                    </div>
                    <span className="text-[var(--muted)] font-mono text-[11px]">
                      {itemDrawer.item.created_at ? new Date(itemDrawer.item.created_at).toLocaleString() : "Date unknown"}
                    </span>
                  </div>
                </div>

                {/* METRICS */}
                <div className="flex items-center gap-4 text-xs font-semibold text-[var(--muted)]">
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp size={14} className="text-indigo-400" />
                    <span>{itemDrawer.item.helpful_count || 0} Upvotes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-purple-400" />
                    <span>{itemDrawer.item.reply_count || itemDrawer.replies?.length || 0} Replies</span>
                  </div>
                  {itemDrawer.item.view_count !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Eye size={14} className="text-emerald-400" />
                      <span>{itemDrawer.item.view_count || 0} Views</span>
                    </div>
                  )}
                </div>
              </div>

              {/* POST BODY / EDIT FORM */}
              {itemDrawer.isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveItemEdit(itemDrawer.item, formData);
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--muted)]">Title</label>
                    <input
                      name="title"
                      defaultValue={itemDrawer.item.title}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--muted)]">Category / Subject</label>
                    <input
                      name="category"
                      defaultValue={itemDrawer.item.category || "General"}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--muted)]">Post Content / Details</label>
                    <textarea
                      name="content"
                      defaultValue={itemDrawer.item.content}
                      rows={6}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 text-sm leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setItemDrawer(prev => ({ ...prev, isEditing: false }))}
                      className="px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-xs font-bold hover:bg-[var(--surface-hover)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* FULL POST CONTENT TEXT */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
                        Post Content & Body Details
                      </span>
                      <button
                        onClick={() => setItemDrawer(prev => ({ ...prev, isEditing: true }))}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <Edit3 size={13} />
                        <span>Edit Content</span>
                      </button>
                    </div>

                    <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap select-text font-normal max-h-72 overflow-y-auto">
                      {itemDrawer.item.content || <span className="italic text-[var(--muted)]">No content text provided.</span>}
                    </div>
                  </div>

                  {/* REPORT DETAILS IF REPORT */}
                  {itemDrawer.item.contentType === "report" && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                      <span className="text-xs font-black uppercase text-rose-400">Report Details</span>
                      <p className="text-xs text-[var(--foreground)]">Reason: {itemDrawer.item.reason || itemDrawer.item.details || "No explanation provided"}</p>
                      <p className="text-[11px] text-[var(--muted)] font-mono">Reported Item ID: {itemDrawer.item.target_id || itemDrawer.item.id}</p>
                    </div>
                  )}

                  {/* COMMENTS / REPLIES SECTION */}
                  <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-indigo-400" />
                        <h4 className="text-sm font-extrabold text-[var(--foreground)]">
                          Discussion Comments & Replies ({itemDrawer.replies?.length || 0})
                        </h4>
                      </div>
                      {itemDrawer.loadingReplies && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <RefreshCw size={13} className="animate-spin text-indigo-400" />
                          <span>Loading replies...</span>
                        </div>
                      )}
                    </div>

                    {itemDrawer.loadingReplies ? (
                      <div className="py-6 text-center text-xs text-[var(--muted)] bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                        <RefreshCw size={18} className="animate-spin mx-auto text-indigo-400 mb-2" />
                        Loading replies from community database...
                      </div>
                    ) : !itemDrawer.replies || itemDrawer.replies.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[var(--muted)] bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                        No replies or answers on this post yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {itemDrawer.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5 group hover:border-[var(--border-hover)] transition-all"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[var(--foreground)]">
                                {reply.author_name || "Community Member"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[var(--muted)] font-mono">
                                  {reply.created_at ? new Date(reply.created_at).toLocaleDateString() : ""}
                                </span>
                                <button
                                  onClick={() => handleDeleteReply(reply.id)}
                                  className="p-1 hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400 rounded-lg transition-colors opacity-80 group-hover:opacity-100"
                                  title="Delete this reply"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MODERATION ACTION CONTROLS */}
                  <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                    {/* LEFT: STATUS CONTROLS */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* APPROVE / ACCEPT BUTTON */}
                      {itemDrawer.item.status === "approved" ? (
                        <button
                          onClick={() => {
                            setCommunityItems(prev => prev.filter(i => i.id !== itemDrawer.item.id));
                            setItemDrawer(null);
                            showToast("Post is approved and live in community. Removed from moderation list.", "success");
                          }}
                          className="px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer"
                          title="Post is approved and live on the community page. Click to dismiss from moderation list."
                        >
                          <CheckCircle2 size={15} />
                          <span>Post Approved (Dismiss from List)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetPostStatus(itemDrawer.item.id, "approved")}
                          disabled={isPending}
                          className="px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 active:scale-95"
                        >
                          <CheckCircle2 size={15} />
                          <span>Approve & Accept</span>
                        </button>
                      )}

                      {/* REJECT BUTTON */}
                      <button
                        onClick={() => handleSetPostStatus(itemDrawer.item.id, "rejected")}
                        disabled={isPending || itemDrawer.item.status === "rejected"}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                          itemDrawer.item.status === "rejected"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-default"
                            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 active:scale-95"
                        }`}
                      >
                        <XCircle size={15} />
                        <span>{itemDrawer.item.status === "rejected" ? "Post Rejected" : "Reject Post"}</span>
                      </button>

                      {/* DISMISS / RESET TO PENDING */}
                      <button
                        onClick={() => handleSetPostStatus(itemDrawer.item.id, "pending")}
                        disabled={isPending || itemDrawer.item.status === "pending"}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          itemDrawer.item.status === "pending"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-default"
                            : "bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] active:scale-95"
                        }`}
                        title="Mark as pending moderation"
                      >
                        <Clock size={14} />
                        <span>{itemDrawer.item.status === "pending" ? "Pending" : "Set to Pending"}</span>
                      </button>

                      {/* DISMISS REPORT IF REPORT */}
                      {itemDrawer.item.contentType === "report" && (
                        <button
                          onClick={() => handleDismissReport(itemDrawer.item.id)}
                          disabled={isPending}
                          className="px-3.5 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold"
                        >
                          Dismiss Report
                        </button>
                      )}
                    </div>

                    {/* RIGHT: DELETE PERMANENTLY */}
                    <button
                      onClick={() => handleDeleteCommunityItem(itemDrawer.item)}
                      disabled={isPending}
                      className="px-4 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-600/25 text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span>Delete Post</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE / EDIT LIVE SUBJECT ROOM */}
      <AnimatePresence>
        {roomModal && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6">
            <div onClick={() => setRoomModal(null)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-5 z-10">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-lg font-extrabold text-[var(--foreground)]">
                  {roomModal.mode === "create" ? "Create Live Subject Room" : "Edit Live Room"}
                </h3>
                <button type="button" onClick={() => setRoomModal(null)} className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)]"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Room Name</label>
                  <input
                    name="name"
                    required
                    defaultValue={roomModal.room?.name || ""}
                    placeholder="e.g. Physics HL Mechanics Review"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Subject</label>
                    <input
                      name="subject"
                      required
                      defaultValue={roomModal.room?.subject || ""}
                      placeholder="e.g. Physics"
                      className="w-full px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Max Participants</label>
                    <input
                      name="max_participants"
                      type="number"
                      min="2"
                      max="200"
                      defaultValue={roomModal.room?.max_participants || 50}
                      className="w-full px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Topic / Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={roomModal.room?.description || ""}
                    placeholder="Describe what students will be studying or discussing in this live room..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={roomModal.room ? (roomModal.room.is_active ?? true) : true}
                      className="rounded border-[var(--border)] accent-indigo-500 w-4 h-4"
                    />
                    <span className="font-bold text-xs text-[var(--foreground)]">Room is Active & Joinable</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                  <button type="button" onClick={() => setRoomModal(null)} className="px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
                    {roomModal.mode === "create" ? "Create Room" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT SUBJECT IN CATALOG */}
      <AnimatePresence>
        {subjectModal && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6">
            <div onClick={() => setSubjectModal(null)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto p-7 rounded-3xl bg-white/5 dark:bg-black/40 backdrop-blur-3xl border border-indigo-500/20 shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)] space-y-6 z-10">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 dark:border-white/5">
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-400">
                  {subjectModal.mode === "create" ? "Add Subject to Catalog" : "Edit Subject"}
                </h3>
                <button type="button" onClick={() => setSubjectModal(null)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--muted)] hover:text-white transition-all"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveSubjectSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Subject Name</label>
                  <input
                    name="name"
                    required
                    defaultValue={subjectModal.subject?.name || ""}
                    placeholder="e.g. Physics"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">IB Program</label>
                    <select
                      name="program"
                      value={subjectModal.program || "dp"}
                      onChange={(e) => setSubjectModal({ ...subjectModal, program: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 transition-all font-medium"
                    >
                      <option value="dp">Diploma Programme (DP)</option>
                      <option value="myp">Middle Years (MYP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">Category / Group</label>
                    <select
                      name="category"
                      required
                      defaultValue={subjectModal.subject?.category || (subjectModal.program === "myp" ? "Language and Literature" : "Group 1: Studies in Language & Literature")}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:border-indigo-500 font-medium cursor-pointer transition-all"
                    >
                      {subjectModal.program !== "myp" && (
                        <optgroup label="Diploma Programme (DP)">
                          <option value="Group 1: Studies in Language & Literature">Group 1: Studies in Language & Literature</option>
                          <option value="Group 2: Language Acquisition">Group 2: Language Acquisition</option>
                          <option value="Group 1 & 2: Languages">Group 1 & 2: Languages</option>
                          <option value="Group 3: Individuals & Societies">Group 3: Individuals & Societies</option>
                          <option value="Group 4: Sciences">Group 4: Sciences</option>
                          <option value="Group 5: Mathematics">Group 5: Mathematics</option>
                          <option value="Group 6: The Arts">Group 6: The Arts</option>
                          <option value="Core Requirements">Core Requirements (TOK / EE)</option>
                        </optgroup>
                      )}
                      {subjectModal.program === "myp" && (
                        <optgroup label="Middle Years Programme (MYP)">
                          <option value="Language and Literature">Language and Literature</option>
                          <option value="Language Acquisition">Language Acquisition</option>
                          <option value="Individuals and Societies">Individuals and Societies</option>
                          <option value="Sciences">Sciences</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Arts">Arts</option>
                          <option value="Design">Design</option>
                          <option value="Physical and Health Education">Physical and Health Education</option>
                          <option value="MYP Core / Interdisciplinary">MYP Core / Interdisciplinary</option>
                        </optgroup>
                      )}
                      {subjectModal.subject?.category && 
                       !["Group 1: Studies in Language & Literature", "Group 2: Language Acquisition", "Group 1 & 2: Languages", "Group 3: Individuals & Societies", "Group 4: Sciences", "Group 5: Mathematics", "Group 6: The Arts", "Core Requirements", "Language and Literature", "Language Acquisition", "Individuals and Societies", "Sciences", "Mathematics", "Arts", "Design", "Physical and Health Education"].includes(subjectModal.subject.category) && (
                        <option value={subjectModal.subject.category}>{subjectModal.subject.category}</option>
                      )}
                    </select>
                  </div>
                </div>

                {subjectModal.program !== "myp" && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 space-y-3">
                    <span className="block text-[11px] font-black text-indigo-400 uppercase tracking-widest">Available Levels (DP)</span>
                    <div className="flex items-center gap-8">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            name="level_sl"
                            defaultChecked={
                              subjectModal.subject?.available_levels
                                ? (typeof subjectModal.subject.available_levels === "string"
                                    ? subjectModal.subject.available_levels.includes("SL")
                                    : Array.isArray(subjectModal.subject.available_levels)
                                    ? subjectModal.subject.available_levels.includes("SL")
                                    : true)
                                : true
                            }
                            className="peer appearance-none w-5 h-5 border-2 border-indigo-500/30 rounded-md checked:bg-indigo-500 checked:border-indigo-500 transition-all cursor-pointer"
                          />
                          <CheckCircle2 size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <span className="font-bold text-sm text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">Standard Level (SL)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            name="level_hl"
                            defaultChecked={
                              subjectModal.subject?.available_levels
                                ? (typeof subjectModal.subject.available_levels === "string"
                                    ? subjectModal.subject.available_levels.includes("HL")
                                    : Array.isArray(subjectModal.subject.available_levels)
                                    ? subjectModal.subject.available_levels.includes("HL")
                                    : true)
                                : true
                            }
                            className="peer appearance-none w-5 h-5 border-2 border-indigo-500/30 rounded-md checked:bg-indigo-500 checked:border-indigo-500 transition-all cursor-pointer"
                          />
                          <CheckCircle2 size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <span className="font-bold text-sm text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">Higher Level (HL)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)] mt-6">
                  <button type="button" onClick={() => setSubjectModal(null)} className="px-5 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] font-bold text-sm transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-[0_4px_20px_-5px_rgba(99,102,241,0.5)] transition-all flex items-center gap-2">
                    {isPending ? <RefreshCw size={16} className="animate-spin" /> : null}
                    {subjectModal.mode === "create" ? "Add Subject" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AUDIT LOG DETAILS */}
      <AnimatePresence>
        {logDetailModal && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain flex items-center justify-center p-4 sm:p-6">
            <div onClick={() => setLogDetailModal(null)} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl space-y-4 z-10">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-lg font-extrabold text-[var(--foreground)]">Audit Trail Event Detail</h3>
                <button type="button" onClick={() => setLogDetailModal(null)} className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)]"><X size={18} /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Event / Action</span>
                  <p className="font-extrabold text-sm text-[var(--foreground)]">{logDetailModal.action}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Actor</span>
                    <p className="font-semibold text-[var(--foreground)] truncate">{logDetailModal.actor_email || "System"}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Timestamp</span>
                    <p suppressHydrationWarning className="font-mono text-[var(--foreground)]">{new Date(logDetailModal.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Details</span>
                  <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{logDetailModal.details || "No additional text details recorded."}</p>
                </div>

                {logDetailModal.target_id && (
                  <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex justify-between font-mono text-[11px]">
                    <span className="text-[var(--muted)]">Target ID:</span>
                    <span className="text-[var(--foreground)] select-all">{logDetailModal.target_id}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setLogDetailModal(null)} className="px-4 py-2 rounded-xl bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs">
                  Close
                </button>
              </div>
            </div>
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
                      onClick={handleRefreshChatDrawer}
                      disabled={refreshingChat}
                      className="px-3 py-1.5 rounded-xl bg-[var(--surface-hover)] hover:bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="Quick hard-refresh room messages and active participants"
                    >
                      <RefreshCw size={13} className={refreshingChat ? "animate-spin text-indigo-400" : ""} />
                      <span>Refresh Chat</span>
                    </button>
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

    </div>
  );
}
