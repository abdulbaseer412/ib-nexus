"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, MessageCircle, Plus, Search, Pin, PinOff,
  Pencil, Trash2, Archive, MoreHorizontal, ChevronDown, X,
  Copy, Check, CheckCircle2, ThumbsUp, ThumbsDown, RefreshCw, Square,
  Bot, User, Zap, Menu, ChevronRight, AlertCircle, AlertTriangle, ArrowDown,
  Paperclip, Image as ImageIcon, FileText, Trash, Volume2, VolumeX, Ghost,
  Share2, RotateCcw, Link2, ShieldCheck
} from "lucide-react";
import { sanitizeAiResponse } from "@/lib/ai/response-sanitizer";
import { PRESET_AVATARS } from "@/lib/avatars";
import NexusLoadingState from "@/components/ui/NexusLoadingState";


// ═══════════════════════════════════════════════════════════════
// SUGGESTED PROMPTS
// ═══════════════════════════════════════════════════════════════

const SUGGESTED_PROMPTS = [
  { prompt: "Explain the Krebs Cycle step by step", topic: "Biology" },
  { prompt: "Help me structure my TOK essay", topic: "TOK" },
  { prompt: "Compare mitosis and meiosis in a table", topic: "Biology" },
  { prompt: "Generate practice questions for Chemical Bonding", topic: "Chemistry" },
  { prompt: "Summarise the causes of World War I", topic: "History" },
  { prompt: "Solve this integration problem step by step", topic: "Mathematics" },
  { prompt: "Explain electromagnetic induction", topic: "Physics" },
  { prompt: "Create flashcards for Supply and Demand", topic: "Economics" },
];

// ═══════════════════════════════════════════════════════════════
// FEEDBACK CATEGORIES
// ═══════════════════════════════════════════════════════════════

const NEGATIVE_FEEDBACK_CATEGORIES = [
  "Incorrect information",
  "Not relevant",
  "Too long / too detailed",
  "Poor explanation or format",
  "Other",
];

// ═══════════════════════════════════════════════════════════════
// MARKDOWN RENDERER (safe, no raw HTML)
// ═══════════════════════════════════════════════════════════════

function renderMarkdown(text) {
  if (!text) return "";

  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const langLabel = lang ? `<div class="ai-code-lang">${lang}</div>` : "";
      return `<div class="ai-code-block">${langLabel}<pre><code>${code.trim()}</code></pre></div>`;
    })
    .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="ai-h2">$1</h2>')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, '<hr class="ai-hr"/>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match
        .split("|")
        .filter(Boolean)
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return "<!-- table-sep -->";
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .replace(/^[\-\*] (.+)$/gm, '<li class="ai-li">$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ai-li-ordered">$1</li>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  html = html.replace(
    /(<li class="ai-li">[\s\S]*?<\/li>(\s*<br\/>)?)+/g,
    (match) => `<ul class="ai-ul">${match.replace(/<br\/>/g, "")}</ul>`
  );
  html = html.replace(
    /(<li class="ai-li-ordered">[\s\S]*?<\/li>(\s*<br\/>)?)+/g,
    (match) => `<ol class="ai-ol">${match.replace(/<br\/>/g, "")}</ol>`
  );

  html = html.replace(
    /(<tr>[\s\S]*?<\/tr>(\s*<!-- table-sep -->)?(\s*<br\/?>)?)+/g,
    (match) => {
      const cleaned = match
        .replace(/<!-- table-sep -->/g, "")
        .replace(/<br\/?>/g, "");
      return `<div class="ai-table-wrapper"><table class="ai-table">${cleaned}</table></div>`;
    }
  );

  return `<p>${html}</p>`;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Group conversations by date
// ═══════════════════════════════════════════════════════════════

function groupConversations(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const pinned = [];
  const todayItems = [];
  const yesterdayItems = [];
  const thisWeekItems = [];
  const olderItems = [];

  for (const conv of conversations) {
    if (conv.is_pinned) {
      pinned.push(conv);
      continue;
    }
    const updated = new Date(conv.updated_at);
    if (updated >= today) todayItems.push(conv);
    else if (updated >= yesterday) yesterdayItems.push(conv);
    else if (updated >= weekAgo) thisWeekItems.push(conv);
    else olderItems.push(conv);
  }

  return { pinned, todayItems, yesterdayItems, thisWeekItems, olderItems };
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatMessageTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  
  const isToday = date.getDate() === now.getDate() && 
                  date.getMonth() === now.getMonth() && 
                  date.getFullYear() === now.getFullYear();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && 
                      date.getMonth() === yesterday.getMonth() && 
                      date.getFullYear() === yesterday.getFullYear();
  
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  
  if (isToday) return `Today · ${timeStr}`;
  if (isYesterday) return `Yesterday · ${timeStr}`;
  
  const dateStr = date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  return `${dateStr} · ${timeStr}`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN WORKSPACE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AiTutorWorkspace({ userProfile }) {
  // State: conversations & cache
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const messagesCache = useRef({});

  // User avatar URL
  const userAvatarUrl =
    userProfile?.avatar_url ||
    userProfile?.profile_image ||
    userProfile?.avatar ||
    userProfile?.image_url ||
    null;

  // State: composer input & multi-attachments
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamModelInfo, setStreamModelInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const isSendingRef = useRef(false);

  const [composerAttachments, setComposerAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // State: model picker
  const [selectedModelId, setSelectedModelId] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showErrorModelPicker, setShowErrorModelPicker] = useState(false);

  // State: sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);

  // State: actions & modals
  const [contextMenu, setContextMenu] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [sharedIndex, setSharedIndex] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackCategory, setFeedbackCategory] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittedFeedback, setSubmittedFeedback] = useState(new Set());
  const [feedbackStatus, setFeedbackStatus] = useState("idle"); // idle, submitting, success, error

  // State: Share Modal (ChatGPT Style)
  const [shareModalData, setShareModalData] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [cardCopied, setCardCopied] = useState(false);
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);

  // State: scroll
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  
  // State: message editing
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");

  // State: TTS
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // State: Temporary Chat
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [showTurnOffTempModal, setShowTurnOffTempModal] = useState(false);

  // Refs
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const modelPickerRef = useRef(null);
  const errorModelPickerRef = useRef(null);
  const contextMenuRef = useRef(null);

  const programme = (() => {
    const p = userProfile?.ib_program || userProfile?.programme || "";
    if (p.toLowerCase().includes("dp")) return "DP";
    if (p.toLowerCase().includes("myp")) return "MYP";
    return p.toUpperCase() || null;
  })();
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations?action=list");
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const targetId = params.get("conversationId") || params.get("id") || params.get("c");
          if (targetId && data.conversations.some((c) => c.id === targetId)) {
            setActiveConversationId(targetId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  // ─── Bootstrap tables & load conversations ────────────────
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [modelData, data] = await Promise.all([
          fetch("/api/ai/conversations?action=models").then(r => r.json()),
          fetch("/api/ai/conversations?action=list").then(r => r.json())
        ]);
        
        if (!isMounted) return;

        if (modelData.models) {
          setAvailableModels(modelData.models);
          const activeModels = modelData.models.filter(m => m.isAvailable !== false && !m.isPaused && !m.is_paused);
          const defaultModel = activeModels.find(m => m.isDefault) || activeModels[0] || modelData.models[0];
          if (defaultModel) setSelectedModelId(defaultModel.id);
        }

        if (data.conversations) {
          setConversations(data.conversations);
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const targetId = params.get("conversationId") || params.get("id") || params.get("c");
            if (targetId && data.conversations.some((c) => c.id === targetId)) {
              setActiveConversationId(targetId);
            }
          }
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        if (isMounted) setLoadingConversations(false);
      }
    }

    init();

    // Safeguard: Ensure selected model is not paused/disabled
    if (availableModels.length > 0 && selectedModelId) {
      const current = availableModels.find((m) => m.id === selectedModelId);
      if (current && (current.isPaused || current.is_paused || current.isAvailable === false)) {
        const activeFallback = availableModels.find((m) => m.isAvailable !== false && !m.isPaused && !m.is_paused);
        if (activeFallback) {
          setSelectedModelId(activeFallback.id);
        }
      }
    }
    
    // Load TTS preference
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nexus_tts_enabled");
      if (stored === "true") setTtsEnabled(true);
    }
    
    // Cleanup TTS on unmount
    return () => {
      isMounted = false;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);



  // ─── Load messages with instant memory caching ────────────
  const selectConversation = useCallback((convId) => {
    setIsTemporaryChat(false);
    setActiveConversationId(convId);
    setSidebarMobileOpen(false);
    setErrorMsg(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/dashboard/ai?c=${convId}`);
    }

    // Instant UI switch if cached in memory!
    if (messagesCache.current[convId]) {
      setMessages(messagesCache.current[convId]);
      setLoadingMessages(false);
    } else {
      setMessages([]);
      setLoadingMessages(true);
    }
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const abortController = new AbortController();

    async function fetchMessages() {
      try {
        const res = await fetch(
          `/api/ai/conversations?action=messages&id=${activeConversationId}`,
          { signal: abortController.signal }
        );
        const data = await res.json();
        if (data.messages && !abortController.signal.aborted) {
          // Normalize attachment property for each message
          const normalized = data.messages.map((m) => {
            let atts = m.attachments || [];
            if (!Array.isArray(atts) && m.attachment) {
              atts = [m.attachment];
            }
            return { ...m, attachments: atts };
          });

          // Update cache & state with DB messages.
          // If DB returned messages (normalized.length > 0), use DB messages.
          // If DB returned empty [] but local cache has messages from active session, do not wipe cache!
          const existingCache = messagesCache.current[activeConversationId];
          if (normalized.length > 0 || !existingCache || existingCache.length === 0) {
            messagesCache.current[activeConversationId] = normalized;
            setMessages(normalized);
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to load messages:", err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingMessages(false);
        }
      }
    }

    fetchMessages();

    return () => {
      abortController.abort();
    };
  }, [activeConversationId]);

  // ─── Auto-scroll logic ─────────────────────────────────────
  useEffect(() => {
    if (!userScrolledUp && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamingContent, userScrolledUp]);

  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolledUp(distanceFromBottom > 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      setUserScrolledUp(false);
    }
  }, []);

  // ─── Close dropdowns on outside click & Escape key ─────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
        setShowModelPicker(false);
      }
      if (errorModelPickerRef.current && !errorModelPickerRef.current.contains(e.target)) {
        setShowErrorModelPicker(false);
      }
      if (
        contextMenu &&
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target) &&
        !e.target.closest(".conv-more-btn")
      ) {
        setContextMenu(null);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (showLearnMoreModal) setShowLearnMoreModal(false);
        if (shareModalData) setShareModalData(null);
        if (showModelPicker) setShowModelPicker(false);
        if (showErrorModelPicker) setShowErrorModelPicker(false);
        if (contextMenu) setContextMenu(null);
      }
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu, shareModalData, showModelPicker, showErrorModelPicker, showLearnMoreModal]);

  // ─── Search conversations (ONLY titles per Req 19) ─────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ai/conversations?action=search&q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        setSearchResults(data.conversations || []);
      } catch {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Temporary Chat Toggle & Confirmation ──────────────────
  const confirmTurnOffTemporaryChat = useCallback(() => {
    setIsTemporaryChat(false);
    if (conversations.length > 0) {
      const firstConv = conversations[0];
      setActiveConversationId(firstConv.id);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/dashboard/ai?c=${firstConv.id}`);
      }
    } else {
      handleNewChat(true);
    }
  }, [conversations]);

  const handleToggleTemporaryChat = useCallback(() => {
    if (!isTemporaryChat) {
      setIsTemporaryChat(true);
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setActiveConversationId(tempId);
      setMessages([]);
      messagesCache.current[tempId] = [];
      setStreamingContent("");
      setStreamModelInfo(null);
      setErrorMsg(null);
      setComposerAttachments([]);
      setSidebarMobileOpen(false);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/dashboard/ai?temporary=true");
      }
    } else {
      setShowTurnOffTempModal(true);
    }
  }, [isTemporaryChat]);

  // ─── New Chat ──────────────────────────────────────────────
  const handleNewChat = useCallback(async (forcedNormal = false) => {
    if (isTemporaryChat && !forcedNormal) {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setActiveConversationId(tempId);
      setMessages([]);
      messagesCache.current[tempId] = [];
      setStreamingContent("");
      setStreamModelInfo(null);
      setErrorMsg(null);
      setComposerAttachments([]);
      setSidebarMobileOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          modelId: selectedModelId,
        }),
      });
      const data = await res.json();
      if (data.conversation) {
        setIsTemporaryChat(false);
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConversationId(data.conversation.id);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `/dashboard/ai?c=${data.conversation.id}`);
        }
        setMessages([]);
        messagesCache.current[data.conversation.id] = [];
        setStreamingContent("");
        setStreamModelInfo(null);
        setErrorMsg(null);
        setSidebarMobileOpen(false);
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [selectedModelId, isTemporaryChat]);

  // ─── Multi-File Upload Handler ─────────────────────────────
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(",")[1];
        const newAtt = {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          mimeType: file.type || (isImage ? "image/png" : "application/octet-stream"),
          size: file.size,
          formattedSize: formatBytes(file.size),
          type: isImage ? "image" : "document",
          data: base64,
        };
        setComposerAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = null;
  };

  const removeComposerAttachment = (id) => {
    setComposerAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // ─── Calculate stable sequential attachment index ─────────
  const computeIndexedAttachments = (newAtts, currentMsgs) => {
    if (!newAtts || newAtts.length === 0) return [];

    let imageCount = 0;
    let docCount = 0;

    currentMsgs.forEach((m) => {
      const atts = m.attachments || (m.attachment ? [m.attachment] : []);
      atts.forEach((a) => {
        if (a.type === "image" || a.mimeType?.startsWith("image/")) {
          imageCount++;
        } else {
          docCount++;
        }
      });
    });

    return newAtts.map((att) => {
      let indexName = "";
      if (att.type === "image" || att.mimeType?.startsWith("image/")) {
        imageCount++;
        indexName = `Image ${imageCount}`;
      } else {
        docCount++;
        indexName = `Document ${docCount}`;
      }
      return { ...att, indexName };
    });
  };

  // ─── Send Message ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    const hasAttachments = composerAttachments.length > 0;

    if ((!trimmed && !hasAttachments) || isGenerating || isSendingRef.current) return;
    isSendingRef.current = true;

    let convId = activeConversationId;
    const indexedAtts = computeIndexedAttachments(composerAttachments, messages);

    const userMsg = {
      role: "user",
      content: trimmed,
      attachments: indexedAtts,
      created_at: new Date().toISOString(),
    };

    let localMessages = [];

    // Create conversation if none active
    if (!convId) {
      try {
        const defaultTitle = trimmed ? (trimmed.length <= 35 ? trimmed : trimmed.substring(0, 32) + "…") : "Attachment Chat";
        const res = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            title: defaultTitle,
            modelId: selectedModelId,
          }),
        });
        const data = await res.json();
        if (data.conversation) {
          convId = data.conversation.id;
          localMessages = [userMsg];
          setConversations((prev) => [data.conversation, ...prev]);
          // Cache user message for new convId before activeConversationId triggers fetchMessages
          messagesCache.current[convId] = localMessages;
          setMessages(localMessages);
          setActiveConversationId(convId);
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", `/dashboard/ai?c=${convId}`);
          }
        }
      } catch (err) {
        setErrorMsg("Failed to create conversation. Please try again.");
        isSendingRef.current = false;
        return;
      }
    } else {
      localMessages = [...messages, userMsg];
      setMessages(localMessages);
      messagesCache.current[convId] = localMessages;
    }

    setInput("");
    setComposerAttachments([]);
    setErrorMsg(null);
    setIsGenerating(true);
    setStreamingContent("");
    setStreamModelInfo(null);
    setUserScrolledUp(false);

    // Persist user message in Supabase DB
    try {
      const userMsgRes = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addMessage",
          conversationId: convId,
          role: "user",
          content: trimmed,
          attachments: indexedAtts,
        }),
      });
      const userData = await userMsgRes.json();
      if (userData.message && userData.message.created_at) {
        setMessages(prev => {
          const updated = [...prev];
          const lastUserMsgIdx = updated.findLastIndex(m => m.role === "user");
          if (lastUserMsgIdx !== -1) {
            updated[lastUserMsgIdx] = { ...updated[lastUserMsgIdx], ...userData.message };
          }
          messagesCache.current[convId] = updated;
          return updated;
        });
      }
    } catch (err) {
      console.warn("Failed to persist user message:", err);
    }


    // Build message history for API from local variable to avoid race conditions
    const apiHistory = localMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      content: m.content,
      attachments: m.attachments || (m.attachment ? [m.attachment] : []),
    }));


    // Stream AI response
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiHistory,
          modelId: selectedModelId,
          conversationId: convId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        setErrorMsg(errData.error || "AI service error.");
        setIsGenerating(false);
        isSendingRef.current = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let modelInfo = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;

          const jsonStr = trimmedLine.substring(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.type === "metadata") {
              modelInfo = {
                modelId: parsed.modelId,
                modelDisplayName: parsed.modelDisplayName,
                requestedModelId: parsed.requestedModelId,
                sourcesUsed: parsed.sourcesUsed || [],
              };
              setStreamModelInfo(modelInfo);
              continue;
            }

            if (parsed.type === "title") {
              const newTitle = parsed.title;
              setConversations((prev) =>
                prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
              );
              continue;
            }

            if (parsed.error) {
              setErrorMsg(parsed.error);
              continue;
            }

            if (parsed.text) {
              fullText += parsed.text;
              setStreamingContent(sanitizeAiResponse(fullText));
            }
          } catch {}
        }
      }

      // Finalize AI message
      const cleanedContent = sanitizeAiResponse(fullText);

      // Lock generation state immediately when stream ends
      setIsGenerating(false);
      isSendingRef.current = false;
      setAbortController(null);

      if (cleanedContent) {
        let finalModelDisplayName = modelInfo?.modelDisplayName || null;
        if (modelInfo && modelInfo.modelId !== modelInfo.requestedModelId) {
          const requestedModel = availableModels.find(m => m.id === modelInfo.requestedModelId);
          const reqName = requestedModel ? requestedModel.displayName : modelInfo.requestedModelId;
          finalModelDisplayName = `${modelInfo.modelDisplayName} (Fallback from ${reqName})`;
        }

        const aiMsg = {
          role: "assistant",
          content: cleanedContent,
          model_id: modelInfo?.modelId || selectedModelId,
          model_display_name: finalModelDisplayName,
          created_at: new Date().toISOString(),
          isFallback: modelInfo && modelInfo.modelId !== modelInfo.requestedModelId,
          requestedModelName: modelInfo && modelInfo.modelId !== modelInfo.requestedModelId ? 
            (availableModels.find(m => m.id === modelInfo.requestedModelId)?.displayName || modelInfo.requestedModelId) : null,
          sources_used: modelInfo?.sourcesUsed || [],
        };

        setMessages((prev) => {
          const updated = [...prev, aiMsg];
          messagesCache.current[convId] = updated;
          return updated;
        });
        setStreamingContent("");

        // Non-blocking background persistence
        fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addMessage",
            conversationId: convId,
            role: "assistant",
            content: cleanedContent,
            modelId: modelInfo?.modelId || selectedModelId,
            modelDisplayName: finalModelDisplayName,
            sourcesUsed: modelInfo?.sourcesUsed || [],
          }),
        })
        .then(res => res.json())
        .then(data => {
           if (data.message && data.message.created_at) {
             setMessages(prev => {
                const updated = [...prev];
                const lastAiMsgIdx = updated.findLastIndex(m => m.role === "assistant");
                if (lastAiMsgIdx !== -1) {
                  updated[lastAiMsgIdx] = { ...updated[lastAiMsgIdx], ...data.message };
                }
                messagesCache.current[convId] = updated;
                return updated;
             });
           }
        })
        .catch((err) => console.warn("Failed to persist AI message:", err));
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setErrorMsg("Failed to get AI response. Please try again.");
      }
    } finally {
      setIsGenerating(false);
      isSendingRef.current = false;
      setAbortController(null);
    }
  }, [input, composerAttachments, isGenerating, activeConversationId, messages, selectedModelId, availableModels]);

  // ─── Edit Message ──────────────────────────────────────────
  const handleEditSubmit = useCallback(async (msgId, newContent) => {
    const trimmed = newContent.trim();
    if (!trimmed || isGenerating || isSendingRef.current) return;
    isSendingRef.current = true;

    // 1. Find message index
    const targetIdx = messages.findIndex(m => m.id === msgId);
    if (targetIdx === -1) {
      isSendingRef.current = false;
      return;
    }

    const targetMsg = messages[targetIdx];

    // 2. Truncate DB
    try {
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "editMessage",
          conversationId: activeConversationId,
          messageId: msgId,
          newContent: trimmed,
        }),
      });
    } catch (err) {
      console.error("Failed to edit message:", err);
    }

    // 3. Update local state
    const truncatedMessages = messages.slice(0, targetIdx + 1);
    truncatedMessages[targetIdx] = { ...targetMsg, content: trimmed };
    setMessages(truncatedMessages);
    messagesCache.current[activeConversationId] = truncatedMessages;
    
    setEditingMessageId(null);
    setEditContent("");
    setErrorMsg(null);
    setIsGenerating(true);
    setStreamingContent("");
    setStreamModelInfo(null);

    // 4. Build API history
    const apiHistory = truncatedMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      content: m.content,
      attachments: m.attachments || (m.attachment ? [m.attachment] : []),
    }));

    // 5. Stream new response
    const controller = new AbortController();
    setAbortController(controller);
    let fullText = "";
    let modelInfo = null;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiHistory,
          modelId: selectedModelId,
          conversationId: activeConversationId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        setErrorMsg(errData.error || "AI service error.");
        setIsGenerating(false);
        isSendingRef.current = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.replace("data: ", "").trim();
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.modelDisplayName) modelInfo = parsed;
            if (parsed.error) { setErrorMsg(parsed.error); continue; }
            if (parsed.text) {
              fullText += parsed.text;
              setStreamingContent(sanitizeAiResponse(fullText));
            }
          } catch {}
        }
      }

      const cleanedContent = sanitizeAiResponse(fullText);
      setIsGenerating(false);
      isSendingRef.current = false;
      setAbortController(null);

      if (cleanedContent) {
        let finalModelDisplayName = modelInfo?.modelDisplayName || null;
        if (modelInfo && modelInfo.modelId !== modelInfo.requestedModelId) {
          const requestedModel = availableModels.find(m => m.id === modelInfo.requestedModelId);
          const reqName = requestedModel ? requestedModel.displayName : modelInfo.requestedModelId;
          finalModelDisplayName = `${modelInfo.modelDisplayName} (Fallback from ${reqName})`;
        }

        const aiMsg = {
          role: "assistant",
          content: cleanedContent,
          model_id: modelInfo?.modelId || selectedModelId,
          model_display_name: finalModelDisplayName,
          created_at: new Date().toISOString(),
          isFallback: modelInfo && modelInfo.modelId !== modelInfo.requestedModelId,
          sources_used: modelInfo?.sourcesUsed || [],
        };

        setMessages((prev) => {
          const updated = [...prev, aiMsg];
          messagesCache.current[activeConversationId] = updated;
          return updated;
        });
        setStreamingContent("");

        fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addMessage",
            conversationId: activeConversationId,
            role: "assistant",
            content: cleanedContent,
            modelId: modelInfo?.modelId || selectedModelId,
            modelDisplayName: finalModelDisplayName,
            sourcesUsed: modelInfo?.sourcesUsed || [],
          }),
        }).catch(() => {});
      }
    } catch (err) {
      if (err.name !== "AbortError") setErrorMsg("Failed to get AI response.");
    } finally {
      setIsGenerating(false);
      isSendingRef.current = false;
      setAbortController(null);
    }
  }, [isGenerating, activeConversationId, messages, selectedModelId, availableModels]);

  // ─── Stop Generation ──────────────────────────────────────
  const handleStop = useCallback(async () => {
    if (abortController) {
      abortController.abort();
      setIsGenerating(false);
      isSendingRef.current = false;

      if (streamingContent) {
        let finalModelDisplayName = streamModelInfo?.modelDisplayName || null;
        if (streamModelInfo && streamModelInfo.modelId !== streamModelInfo.requestedModelId) {
          const requestedModel = availableModels.find(m => m.id === streamModelInfo.requestedModelId);
          const reqName = requestedModel ? requestedModel.displayName : streamModelInfo.requestedModelId;
          finalModelDisplayName = `${streamModelInfo.modelDisplayName} (Fallback from ${reqName})`;
        }
        
        const partialContent = streamingContent + "\n\n*[Cancelled by User]*";
        
        const aiMsg = {
          role: "assistant",
          content: partialContent,
          model_id: streamModelInfo?.modelId || selectedModelId,
          model_display_name: finalModelDisplayName,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => {
          const updated = [...prev, aiMsg];
          if (activeConversationId) messagesCache.current[activeConversationId] = updated;
          return updated;
        });
        setStreamingContent("");
        setAbortController(null);

        try {
          await fetch("/api/ai/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "addMessage",
              conversationId: activeConversationId,
              role: "assistant",
              content: partialContent,
              modelId: streamModelInfo?.modelId || selectedModelId,
              modelDisplayName: finalModelDisplayName,
            }),
          });
        } catch {}
      }
    }
  }, [abortController, streamingContent, streamModelInfo, selectedModelId, availableModels, activeConversationId]);

  // ─── Regenerate / Retry AI response ───────────────────────
  const handleRetry = useCallback(async (overrideModelId = null) => {
    if (isGenerating || isSendingRef.current || messages.length < 1) return;

    // 1. Find the target user message
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;

    const targetUserIdx = messages.length - 1 - lastUserIndex;
    const targetUserMsg = messages[targetUserIdx];

    // 2. Truncate local messages to keep ONLY up to the user message on screen, deleting ALL previous AI response(s)
    const truncatedMessages = messages.slice(0, targetUserIdx + 1);
    setMessages(truncatedMessages);
    if (activeConversationId) {
      messagesCache.current[activeConversationId] = truncatedMessages;
    }

    // 3. Clear any error, set generating state immediately
    setErrorMsg(null);
    setIsGenerating(true);
    isSendingRef.current = true;
    setStreamingContent("");
    setStreamModelInfo(null);
    setUserScrolledUp(false);

    // Truncate DB messages after targetUserMsg so old AI responses are DELETED permanently from DB
    if (activeConversationId && !isTemporaryChat && typeof activeConversationId === "string" && !activeConversationId.startsWith("temp_")) {
      try {
        await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "truncateAfter",
            conversationId: activeConversationId,
            messageId: targetUserMsg?.id || null,
            createdAt: targetUserMsg?.created_at || null,
          }),
        });
      } catch (err) {
        console.warn("Failed to truncate DB messages on retry:", err);
      }
    }

    const modelToUse = overrideModelId || selectedModelId;

    // 4. Build message history for API up to and including the user message
    const apiHistory = truncatedMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      content: m.content,
      attachments: m.attachments || (m.attachment ? [m.attachment] : []),
    }));

    // 5. Stream new AI response immediately
    const controller = new AbortController();
    setAbortController(controller);
    let fullText = "";
    let modelInfo = null;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiHistory,
          modelId: modelToUse,
          conversationId: activeConversationId,
          isTemporary: isTemporaryChat || (typeof activeConversationId === "string" && activeConversationId.startsWith("temp_")),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        setErrorMsg(errData.error || "AI service error.");
        setIsGenerating(false);
        isSendingRef.current = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.replace("data: ", "").trim();
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.modelDisplayName) modelInfo = parsed;
            if (parsed.error) { setErrorMsg(parsed.error); continue; }
            if (parsed.text) {
              fullText += parsed.text;
              setStreamingContent(sanitizeAiResponse(fullText));
            }
          } catch {}
        }
      }

      const cleanedContent = sanitizeAiResponse(fullText);
      setIsGenerating(false);
      isSendingRef.current = false;
      setAbortController(null);

      if (cleanedContent) {
        let finalModelDisplayName = modelInfo?.modelDisplayName || null;
        if (modelInfo && modelInfo.modelId !== modelInfo.requestedModelId) {
          const requestedModel = availableModels.find(m => m.id === modelInfo.requestedModelId);
          const reqName = requestedModel ? requestedModel.displayName : modelInfo.requestedModelId;
          finalModelDisplayName = `${modelInfo.modelDisplayName} (Fallback from ${reqName})`;
        }

        const aiMsg = {
          role: "assistant",
          content: cleanedContent,
          model_id: modelInfo?.modelId || modelToUse,
          model_display_name: finalModelDisplayName,
          created_at: new Date().toISOString(),
          isFallback: modelInfo && modelInfo.modelId !== modelInfo.requestedModelId,
          sources_used: modelInfo?.sourcesUsed || [],
        };

        setMessages(() => {
          const updated = [...truncatedMessages, aiMsg];
          if (activeConversationId) messagesCache.current[activeConversationId] = updated;
          return updated;
        });
        setStreamingContent("");

        if (activeConversationId) {
          fetch("/api/ai/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "addMessage",
              conversationId: activeConversationId,
              role: "assistant",
              content: cleanedContent,
              modelId: modelInfo?.modelId || modelToUse,
              modelDisplayName: finalModelDisplayName,
              sourcesUsed: modelInfo?.sourcesUsed || [],
              isTemporary: isTemporaryChat || activeConversationId.startsWith("temp_"),
            }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setErrorMsg("Failed to get AI response.");
      }
    } finally {
      setIsGenerating(false);
      isSendingRef.current = false;
      setAbortController(null);
    }
  }, [messages, isGenerating, selectedModelId, activeConversationId, isTemporaryChat, availableModels]);

  // ─── Copy message ──────────────────────────────────────────
  const handleCopy = useCallback((text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  // ─── Share Modal Trigger & Logic (ChatGPT Style) ─────────
  const openShareModal = useCallback(({ type = "response", title, content, shareUrl }) => {
    const defaultTitle = type === "prompt" ? "Share prompt" : "IB Nexus";
    let baseUrl = "";
    if (typeof window !== "undefined") {
      baseUrl = window.location.origin + window.location.pathname;
    }
    const defaultUrl = activeConversationId ? `${baseUrl}?c=${activeConversationId}` : baseUrl;

    setShareModalData({
      type,
      title: title || defaultTitle,
      content: content || "",
      shareUrl: shareUrl || defaultUrl,
    });
    setShareCopied(false);
    setCardCopied(false);
  }, [activeConversationId]);

  const handleShare = useCallback((msgOrContent, type = "response") => {
    const content = typeof msgOrContent === "string" ? msgOrContent : (msgOrContent?.content || "");
    const currentConv = conversations.find(c => c.id === activeConversationId);
    const title = type === "prompt" 
      ? "Share prompt" 
      : (currentConv?.title || "IB Nexus");

    openShareModal({ type, title, content });
  }, [conversations, activeConversationId, openShareModal]);

  // ─── Feedback ──────────────────────────────────────────────
  const handleFeedbackSubmit = useCallback(
    async (rating, explicitMessage = null) => {
      const targetMsg = explicitMessage || feedbackModal;
      if (!targetMsg) return;

      const payload = {
        action: "feedback",
        conversationId: activeConversationId,
        messageId: targetMsg.id || null,
        rating,
        category: feedbackCategory,
        comment: feedbackComment,
        modelId: targetMsg.model_id || selectedModelId,
      };

      setFeedbackStatus("submitting");

      try {
        const res = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("[handleFeedbackSubmit] API error:", res.status, errData);
          throw new Error(errData.error || "Failed");
        }

        // Update local messages state to reflect feedback instantly
        setMessages((prev) => {
          const updated = prev.map(m => {
            if ((targetMsg.id && m.id === targetMsg.id) || m === targetMsg) {
              return { ...m, feedback: rating };
            }
            return m;
          });
          if (activeConversationId) messagesCache.current[activeConversationId] = updated;
          return updated;
        });

        setFeedbackStatus("success");
      } catch (err) {
        console.error("[handleFeedbackSubmit] catch:", err);
        setFeedbackStatus("error");
      }
    },
    [feedbackModal, feedbackCategory, feedbackComment, activeConversationId, selectedModelId]
  );

  const resetFeedbackModal = useCallback(() => {
    setFeedbackModal(null);
    setFeedbackCategory(null);
    setFeedbackComment("");
    setFeedbackStatus("idle");
  }, []);

  // ─── TTS Speech ──────────────────────────────────────────
  const toggleTTSPreference = useCallback(() => {
    setTtsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("nexus_tts_enabled", next);
      if (!next && speakingMsgId) {
        window.speechSynthesis.cancel();
        setSpeakingMsgId(null);
      }
      return next;
    });
  }, [speakingMsgId]);

  const handleSpeak = useCallback((msgId, text) => {
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    
    // Clean markdown before speaking
    const cleanTextForSpeech = text.replace(/[*#`~]/g, '').replace(/\[.*?\]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech);
    utterance.onend = () => setSpeakingMsgId(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingMsgId(msgId);
  }, [speakingMsgId]);

  // ─── Fast Optimistic Single Delete ─────────────────────────
  const handleDelete = useCallback(async (convId) => {
    // 1. Immediately remove from local state and cache
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    delete messagesCache.current[convId];

    if (activeConversationId === convId) {
      setActiveConversationId(null);
      setMessages([]);
    }
    setDeleteConfirm(null);
    setContextMenu(null);

    // 2. Execute backend deletion (skip DB for temp IDs)
    if (convId && convId.startsWith("temp_")) return;

    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", conversationId: convId }),
      });
      if (!res.ok) {
        await loadConversations();
      }
    } catch {
      await loadConversations();
    }
  }, [activeConversationId, loadConversations]);

  // ─── Clear All Chats Feature ───────────────────────────────
  const handleClearAll = useCallback(async () => {
    // 1. Immediately clear UI
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    messagesCache.current = {};
    setShowClearAllModal(false);

    // 2. Execute backend bulk deletion
    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearAll" }),
      });
      if (!res.ok) {
        await loadConversations();
      }
    } catch {
      await loadConversations();
    }
  }, [loadConversations]);

  // ─── Pin & Rename & Archive ────────────────────────────────
  const handlePin = useCallback(async (convId, isPinned) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, is_pinned: isPinned } : c))
    );
    setContextMenu(null);
    if (convId && convId.startsWith("temp_")) return;
    try {
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pin", conversationId: convId, isPinned }),
      });
    } catch {}
  }, []);

  const handleRename = useCallback(async (convId, newTitleOverride) => {
    const valToUse = typeof newTitleOverride === "string" ? newTitleOverride : renameValue;
    const trimmed = valToUse ? valToUse.trim() : "";
    if (!trimmed) {
      setRenameId(null);
      setRenameValue("");
      return;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: trimmed } : c))
    );
    setRenameId(null);
    setRenameValue("");
    if (convId && convId.startsWith("temp_")) return;
    try {
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", conversationId: convId, title: trimmed }),
      });
    } catch {}
  }, [renameValue]);

  const handleArchive = useCallback(async (convId, isArchived) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    delete messagesCache.current[convId];
    if (activeConversationId === convId) {
      setActiveConversationId(null);
      setMessages([]);
    }
    setContextMenu(null);
    if (convId && convId.startsWith("temp_")) return;
    try {
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", conversationId: convId, isArchived }),
      });
    } catch {}
  }, [activeConversationId]);

  // ─── Textarea auto-resize & keypress ──────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [input]);

  // ─── Metadata ─────────────────────────────────────────────
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const grouped = groupConversations(searchResults || conversations);
  const displayedConvs = searchResults || conversations;

  const currentModel = availableModels.find((m) => m.id === selectedModelId) || availableModels[0] || { displayName: "Nexus AI", provider: "google" };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="ai-workspace">
      <style>{workspaceStyles}</style>

      {/* ═══ SIDEBAR ═══ */}
      {sidebarMobileOpen && (<div className="sidebar-overlay" onClick={() => setSidebarMobileOpen(false)} />)}
        <aside className={`ai-sidebar ${sidebarOpen ? "open" : "closed"} ${sidebarMobileOpen ? "mobile-open" : ""}`}>

        <div className="sidebar-content">
          {/* New Chat button */}
          <button className="new-chat-btn" onClick={() => handleNewChat(false)}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>

          {/* Temporary Chat Toggle Button */}
          <button
            className={`temporary-chat-toggle-btn ${isTemporaryChat ? 'active' : ''}`}
            onClick={handleToggleTemporaryChat}
            title={isTemporaryChat ? "Turn off temporary chat — unsaved messages in this conversation will be lost" : "Start a temporary chat where messages aren't saved to history"}
          >
            <div className="flex items-center gap-2">
              <Ghost size={15} />
              <span>Temporary Chat</span>
            </div>
            <div className={`temp-toggle-switch ${isTemporaryChat ? 'on' : 'off'}`} />
          </button>

          {/* Search (Searches ONLY titles per Req 19) */}
          <div className="sidebar-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search conversation titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery("")}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Conversation list */}
          <div className="conversation-list">
            {loadingConversations ? (
              <div className="py-4">
                <NexusLoadingState state="loading" message="Loading chats..." fullHeight={false} />
              </div>
            ) : displayedConvs.length === 0 ? (
              <div className="sidebar-empty">
                <MessageCircle size={24} />
                <p>{searchQuery ? "No matching titles" : "No conversations yet"}</p>
              </div>
            ) : (
              <>
                {grouped.pinned.length > 0 && (
                  <div className="conv-group">
                    <div className="conv-group-label">
                      <Pin size={12} /> Pinned
                    </div>
                    {grouped.pinned.map((conv) => renderConversationItem(conv))}
                  </div>
                )}

                {grouped.todayItems.length > 0 && (
                  <div className="conv-group">
                    <div className="conv-group-label">Today</div>
                    {grouped.todayItems.map((conv) => renderConversationItem(conv))}
                  </div>
                )}

                {grouped.yesterdayItems.length > 0 && (
                  <div className="conv-group">
                    <div className="conv-group-label">Yesterday</div>
                    {grouped.yesterdayItems.map((conv) => renderConversationItem(conv))}
                  </div>
                )}

                {grouped.thisWeekItems.length > 0 && (
                  <div className="conv-group">
                    <div className="conv-group-label">This Week</div>
                    {grouped.thisWeekItems.map((conv) => renderConversationItem(conv))}
                  </div>
                )}

                {grouped.olderItems.length > 0 && (
                  <div className="conv-group">
                    <div className="conv-group-label">Previous</div>
                    {grouped.olderItems.map((conv) => renderConversationItem(conv))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar Footer: Clear All Chats option */}
          {conversations.length > 0 && (
            <div className="sidebar-footer">
              <button className="clear-all-btn" onClick={() => setShowClearAllModal(true)}>
                <Trash size={14} />
                <span>Clear all chats</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <main className="ai-main">
        {/* Header */}
        <header className="ai-header">
          <div className="ai-header-left">
            <button
              className="sidebar-toggle"
              onClick={() => {
                if (window.innerWidth < 768) setSidebarMobileOpen((p) => !p);
                else setSidebarOpen((p) => !p);
              }}
            >
              <Menu size={20} />
            </button>
            <div className="ai-title-area">
              <img
                src="/brand/ib-nexus-icon.png"
                alt="Nexus AI"
                className="header-brand-icon"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <h1 className="ai-title">Nexus AI</h1>
              {isTemporaryChat && (
                <div className="header-temp-badge">
                  <Ghost size={12} />
                  <span>Temporary</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Temporary Chat Warning Banner */}
        {isTemporaryChat && (
          <div className="temporary-chat-banner">
            <div className="temp-banner-info">
              <Ghost size={16} className="temp-banner-icon" />
              <span>
                <strong>Temporary Chat</strong> — Messages in this chat aren't saved in history, trained on, or used for personalization.
              </span>
            </div>
            <button 
              className="temp-banner-close" 
              onClick={handleToggleTemporaryChat}
              title="Turn off temporary chat — unsaved messages in this conversation will be lost"
            >
              Turn off
            </button>
          </div>
        )}

        {/* Chat Area */}
        <div
          className="ai-chat-area"
          ref={chatContainerRef}
          onScroll={handleChatScroll}
        >
          {loadingMessages ? (
            <NexusLoadingState state="loading" message="Loading conversation..." />
          ) : messages.length === 0 && !streamingContent && !activeConversationId ? (
            /* Empty state — Welcome to Nexus AI */
            <div className="ai-welcome">
              <div className="ai-welcome-icon">
                <img
                  src="/brand/ib-nexus-icon.png"
                  alt="Nexus AI Logo"
                  className="welcome-brand-logo"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
              <h2>Nexus AI</h2>
              <p className="ai-welcome-sub">
                {programme ? `${programme} Academic Workspace` : "IB Academic Workspace"}
              </p>
              <p className="ai-welcome-desc">
                Your personal IB academic assistant. Ask questions, upload diagrams and documents, get clear structured explanations, and study guidance.
              </p>

              {/* Suggested Prompts */}
              <div className="ai-suggestions">
                {SUGGESTED_PROMPTS.slice(0, 4).map((p, i) => (
                  <button
                    key={i}
                    className="ai-suggestion"
                    onClick={() => {
                      setInput(p.prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    <span>{p.prompt}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="ai-messages">
              {messages.map((msg, i) => {
                const isFallback = msg.isFallback || (msg.role === "assistant" && msg.model_display_name?.includes("(Fallback from"));
                const reqName = msg.requestedModelName || (isFallback ? msg.model_display_name.match(/\(Fallback from (.*?)\)/)?.[1] : null);
                const actualName = msg.model_display_name ? msg.model_display_name.split(' (')[0] : null;

                const messageAtts = msg.attachments || (msg.attachment ? [msg.attachment] : []);

                // User Avatar Resolution
                const presetAvatar = userAvatarUrl ? PRESET_AVATARS.find(a => a.id === userAvatarUrl) : null;
                const isUrlAvatar = userAvatarUrl && (userAvatarUrl.startsWith("http") || userAvatarUrl.startsWith("data:") || userAvatarUrl.startsWith("/"));
                const userInitial = (userProfile?.full_name || userProfile?.name || userProfile?.display_name || userProfile?.email || "")[0]?.toUpperCase();

                return (
                  <div
                    key={i}
                    className={`ai-message ${msg.role === "user" ? "user-msg group" : "ai-msg"}`}
                  >
                    <div className="msg-avatar">
                      {msg.role === "user" ? (
                        presetAvatar ? (
                          <div
                            className={`w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br ${presetAvatar.color} text-xs leading-none`}
                            title={userProfile?.full_name || "User"}
                          >
                            {presetAvatar.emoji}
                          </div>
                        ) : isUrlAvatar ? (
                          <img
                            src={userAvatarUrl}
                            alt="User Avatar"
                            referrerPolicy="no-referrer"
                            className="avatar-img"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : userInitial ? (
                          <span className="font-bold text-xs text-indigo-300">{userInitial}</span>
                        ) : (
                          <User size={16} />
                        )
                      ) : (
                        <img
                          src="/brand/ib-nexus-icon.png"
                          alt="Nexus AI"
                          className="avatar-img nexus-logo"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="msg-content">
                      {/* ATTACHMENTS PREVIEW ABOVE USER TEXT (Req 4, 5, 6) */}
                      {messageAtts.length > 0 && (
                        <div className="msg-attachments-container">
                          {messageAtts.map((att, attIdx) => {
                            const isImage = att.type === "image" || att.mimeType?.startsWith("image/");
                            const indexTag = att.indexName || (isImage ? `Image ${attIdx + 1}` : `Document ${attIdx + 1}`);

                            if (isImage) {
                              const imgSrc = att.data ? `data:${att.mimeType || 'image/png'};base64,${att.data}` : att.url || att.storagePath;
                              return (
                                <div key={att.id || attIdx} className="msg-attachment-image-card">
                                  <div className="msg-attachment-tag">{indexTag} · {att.name}</div>
                                  {imgSrc ? (
                                    <img src={imgSrc} alt={att.name} className="msg-attachment-preview-img" />
                                  ) : (
                                    <div className="msg-attachment-placeholder">
                                      <ImageIcon size={20} />
                                      <span>{att.name}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            } else {
                              return (
                                <div key={att.id || attIdx} className="msg-attachment-doc-card">
                                  <div className="doc-card-icon">
                                    <FileText size={20} />
                                  </div>
                                  <div className="doc-card-info">
                                    <div className="doc-card-title">{att.name}</div>
                                    <div className="doc-card-sub">{indexTag} · {att.formattedSize || att.size || "Document"}</div>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}

                      {/* TEXT CONTENT */}
                      {msg.role === "user" ? (
                        editingMessageId === msg.id ? (
                          <div className="msg-edit-mode w-full max-w-2xl rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] p-3.5 shadow-lg my-1">
                            <textarea
                              autoFocus
                              className="w-full bg-transparent text-[var(--foreground)] text-sm resize-none outline-none font-sans leading-relaxed"
                              value={editContent}
                              onChange={(e) => {
                                setEditContent(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = Math.min(e.target.scrollHeight, 300) + "px";
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEditSubmit(msg.id, editContent);
                                }
                                if (e.key === "Escape") {
                                  setEditingMessageId(null);
                                  setEditContent("");
                                }
                              }}
                              rows={2}
                              style={{ minHeight: "64px" }}
                            />
                            <div className="flex justify-end items-center gap-2 mt-3">
                              <button
                                className="px-4 py-1.5 rounded-full text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] hover:bg-[var(--border)] hover:text-[var(--foreground)] border border-[var(--border)] transition-all cursor-pointer"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditContent("");
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                className="px-4 py-1.5 rounded-full text-xs font-semibold text-black bg-white hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer"
                                onClick={() => handleEditSubmit(msg.id, editContent)}
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            {msg.content ? <div className="msg-text">{msg.content}</div> : null}

                            {/* Hover-only Icon Toolbar under sent message (ChatGPT style) */}
                            <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[var(--muted)]">
                              <button
                                onClick={() => handleCopy(msg.content, `user-${i}`)}
                                className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                title="Copy text"
                              >
                                {copiedIndex === `user-${i}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              </button>
                              <button
                                onClick={() => handleShare(msg.content, `user-${i}`)}
                                className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                title="Share message"
                              >
                                {sharedIndex === `user-${i}` ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditContent(msg.content);
                                }}
                                className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                title="Edit message"
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <div
                          className="msg-text ai-rendered"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(msg.content),
                          }}
                        />
                      )}

                      {/* Message Timestamp */}
                      <div className="msg-timestamp" style={{ display: 'flex', width: '100%', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'center', marginTop: '2px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', gap: '8px' }}>
                        {formatMessageTime(msg.created_at || new Date().toISOString())}
                      </div>

                      {/* Fallback notification */}
                      {isFallback && (
                        <div className="ai-fallback-notice">
                          <AlertCircle size={14} />
                          <span>{reqName} was unavailable. Response generated with {actualName}.</span>
                        </div>
                      )}

                      {/* Sources Used */}
                      {msg.sources_used && msg.sources_used.length > 0 && (
                        <div className="mt-3 border border-indigo-500/20 bg-indigo-500/5 rounded-lg p-2.5 max-w-xl">
                          <div className="text-xs font-semibold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                            <Zap size={12} />
                            Knowledge Lens Sources
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources_used.map((src, srcIdx) => (
                              <div key={srcIdx} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-200 border border-indigo-500/20 flex items-center gap-1">
                                <span className="opacity-70 font-semibold">{src.label}</span>
                                <span className="truncate max-w-[150px]" title={src.title}>{src.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message actions toolbar + Try again control (ChatGPT style) */}
                      {msg.role === "assistant" && (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex flex-wrap items-center gap-1 text-[var(--muted)]">
                            <button
                              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                              onClick={() => handleCopy(msg.content, `ai-${i}`)}
                              title="Copy response"
                            >
                              {copiedIndex === `ai-${i}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>

                            <button
                              className={`p-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${
                                msg.feedback === 'positive' ? "text-emerald-400" : "hover:text-[var(--foreground)]"
                              }`}
                              onClick={() => handleFeedbackSubmit("positive", msg)}
                              title="Good response"
                            >
                              <ThumbsUp size={13} fill={msg.feedback === 'positive' ? "currentColor" : "none"} />
                            </button>

                            <button
                              className={`p-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${
                                msg.feedback === 'negative' ? "text-rose-400" : "hover:text-[var(--foreground)]"
                              }`}
                              onClick={() => setFeedbackModal(msg)}
                              title="Bad response"
                            >
                              <ThumbsDown size={13} fill={msg.feedback === 'negative' ? "currentColor" : "none"} />
                            </button>

                            <button
                              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                              onClick={() => handleShare(msg.content, `ai-${i}`)}
                              title="Share response"
                            >
                              {sharedIndex === `ai-${i}` ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
                            </button>

                            <button
                              className={`p-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${
                                speakingMsgId === (msg.id || "msg-" + i) ? "text-indigo-400" : "hover:text-[var(--foreground)]"
                              }`}
                              onClick={() => handleSpeak(msg.id || "msg-" + i, msg.content)}
                              title={speakingMsgId === (msg.id || "msg-" + i) ? "Stop speaking" : "Read aloud"}
                            >
                              {speakingMsgId === (msg.id || "msg-" + i) ? <VolumeX size={13} /> : <Volume2 size={13} />}
                            </button>

                            <button
                              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                              onClick={() => handleRetry()}
                              title="Regenerate"
                            >
                              <RotateCcw size={13} />
                            </button>
                          </div>

                          {/* ChatGPT-style "Try again · Used [Model]" pill */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--muted)] hover:border-indigo-500/30 transition-all">
                              <button
                                onClick={() => handleRetry()}
                                className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                title="Regenerate with same model"
                              >
                                <RotateCcw size={12} />
                                <span className="font-medium text-[var(--foreground)]">Try again</span>
                              </button>
                              <span>·</span>
                              <button
                                onClick={() => setShowModelPicker(true)}
                                className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                title="Switch model in selector"
                              >
                                <span>Used {actualName || currentModel?.displayName || "Nexus AI"}</span>
                                <ChevronDown size={12} className="opacity-60" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Streaming message */}
              {isGenerating && streamingContent && (
                <div className="ai-message ai-msg streaming">
                  <div className="msg-avatar">
                    <img
                      src="/brand/ib-nexus-icon.png"
                      alt="Nexus AI"
                      className="avatar-img nexus-logo"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </div>
                  <div className="msg-content">
                    <div
                      className="msg-text ai-rendered"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(streamingContent),
                      }}
                    />
                    <div className="msg-timestamp" style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: '4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
                      {formatMessageTime(new Date().toISOString())}
                    </div>
                    {streamModelInfo && (
                      <span className="msg-model-badge streaming-badge">
                        {streamModelInfo.modelDisplayName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Thinking indicator */}
              {isGenerating && !streamingContent && (
                <div className="ai-message ai-msg">
                  <div className="msg-avatar">
                    <img
                      src="/brand/ib-nexus-icon.png"
                      alt="Nexus AI"
                      className="avatar-img nexus-logo"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </div>
                  <div className="msg-content flex items-center">
                    <div className="thinking-indicator">
                      <div className="thinking-ball" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="ai-error">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                  <div className="retry-split-container" ref={errorModelPickerRef}>
                    <div className="retry-split-btn-group">
                      <button onClick={() => handleRetry()} className="retry-btn retry-main-btn" title="Retry with current model">
                        <RefreshCw size={14} /> Retry
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowErrorModelPicker((p) => !p);
                        }}
                        className={`retry-btn retry-chevron-btn ${showErrorModelPicker ? 'active' : ''}`}
                        title="Retry with a different model"
                      >
                        <ChevronDown size={13} className={`transition-transform duration-200 ${showErrorModelPicker ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {showErrorModelPicker && (
                      <div
                        className="picker-dropdown model-dropdown error-model-dropdown"
                        style={{ bottom: "calc(100% + 6px)", right: 0, left: "auto", top: "auto" }}
                      >
                        {["google", "openai", "groq", "together", "remote_qwen", "ollama"].map((providerId) => {
                          const providerModels = availableModels.filter(
                            (m) => m.provider === providerId
                          );
                          if (providerModels.length === 0) return null;
                          const providerLabel =
                            providerId === "google"
                              ? "GOOGLE GEMINI"
                              : providerId === "openai"
                              ? "OPENAI"
                              : providerId === "groq"
                              ? "GROQ (LPU)"
                              : providerId === "together"
                              ? "TOGETHER AI"
                              : providerId === "remote_qwen" || providerId === "ollama"
                              ? "LOCAL / QWEN"
                              : providerId.toUpperCase();

                          return (
                            <div key={providerId} className="picker-section">
                              <div className="picker-section-label">{providerLabel}</div>
                              {providerModels.map((model) => {
                                const isSelected = selectedModelId === model.id;
                                const isPaused = !!(model.isPaused || model.is_paused || model.status === "Paused");
                                const isSelectable = model.isAvailable !== false && !isPaused;
                                const statusLabel = model.status || (!isSelectable ? (isPaused ? "Paused" : "Offline") : null);

                                return (
                                  <button
                                    key={model.id}
                                    type="button"
                                    className={`picker-option ${isSelected ? "active" : ""} ${
                                      !isSelectable ? "disabled" : ""
                                    }`}
                                    onClick={() => {
                                      if (!isSelectable) return;
                                      setSelectedModelId(model.id);
                                      setShowErrorModelPicker(false);
                                      handleRetry(model.id);
                                    }}
                                    disabled={!isSelectable}
                                    title={
                                      isPaused
                                        ? `${model.displayName} (Paused): Locked by administrator.`
                                        : !isSelectable
                                        ? `${model.displayName}: ${model.description}`
                                        : model.description
                                    }
                                  >
                                    <Zap
                                      size={15}
                                      className={`model-icon ${isSelected ? "selected" : ""}`}
                                    />
                                    <div className="picker-option-text">
                                      <div className="picker-option-header">
                                        <span className="picker-option-name">
                                          {model.displayName}
                                        </span>
                                        {statusLabel && statusLabel !== "Available" && (
                                          <span
                                            className={`offline-badge ${
                                              statusLabel === "Mock Mode"
                                                ? "mock-badge"
                                                : isPaused
                                                ? "paused-badge"
                                                : ""
                                            }`}
                                          >
                                            {statusLabel}
                                          </span>
                                        )}
                                      </div>
                                      <span className="picker-option-meta">
                                        {model.description}
                                      </span>
                                    </div>
                                    {isSelected && <Check size={14} className="check-icon" />}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scroll to bottom button */}
          {userScrolledUp && (
            <button className="scroll-bottom-btn" onClick={scrollToBottom}>
              <ArrowDown size={16} />
              <span>New response</span>
            </button>
          )}
        </div>

        {/* Composer */}
        <div className="ai-composer">
          {/* Multi-Attachment Composer Preview */}
          {composerAttachments.length > 0 && (
            <div className="composer-attachments-preview">
              {composerAttachments.map((att) => (
                <div key={att.id} className="composer-attachment-chip">
                  {att.type === "image" ? <ImageIcon size={14} /> : <FileText size={14} />}
                  <span className="chip-name">{att.name}</span>
                  <span className="chip-size">{att.formattedSize}</span>
                  <button onClick={() => removeComposerAttachment(att.id)} className="chip-remove">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="composer-inner">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
              accept="image/*,.pdf,.txt,.docx,.doc"
              multiple
            />
            <button className="composer-btn attach-btn" onClick={() => fileInputRef.current?.click()} disabled={isGenerating}>
              <Paperclip size={18} />
            </button>
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder="Ask Nexus AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isGenerating}
            />
            <div className="composer-actions">
              {isGenerating ? (
                <button className="composer-btn stop-btn active" onClick={handleStop}>
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  className={`composer-btn send-btn ${(input.trim() || composerAttachments.length > 0) ? "active" : ""}`}
                  onClick={handleSend}
                  disabled={!input.trim() && composerAttachments.length === 0}
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="composer-footer">
            <div className="picker-container" ref={modelPickerRef}>
              <button
                className="model-selector-btn"
                onClick={() => setShowModelPicker((p) => !p)}
                disabled={isGenerating}
              >
                <Plus size={12} />
                <span>{currentModel.displayName}</span>
                <ChevronDown size={12} className={`model-chevron ${showModelPicker ? 'open' : ''}`} />
              </button>

              {showModelPicker && (
                <div
                  className="picker-dropdown model-dropdown"
                  style={{ bottom: "calc(100% + 8px)", top: "auto", left: "0", right: "auto" }}
                >
                  {["google", "openai", "groq", "together", "remote_qwen", "ollama"].map((providerId) => {
                    const providerModels = availableModels.filter(
                      (m) => m.provider === providerId
                    );
                    if (providerModels.length === 0) return null;
                    const providerLabel =
                      providerId === "google"
                        ? "GOOGLE GEMINI"
                        : providerId === "openai"
                        ? "OPENAI"
                        : providerId === "groq"
                        ? "GROQ (LPU)"
                        : providerId === "together"
                        ? "TOGETHER AI"
                        : providerId === "remote_qwen" || providerId === "ollama"
                        ? "LOCAL / QWEN"
                        : providerId.toUpperCase();


                    return (
                      <div key={providerId} className="picker-section">
                        <div className="picker-section-label">{providerLabel}</div>
                        {providerModels.map((model) => {
                          const isSelected = selectedModelId === model.id;
                          const isPaused = !!(model.isPaused || model.is_paused || model.status === "Paused");
                          // Paused models are listed in the dropdown for visibility, but strictly locked & unselectable
                          const isSelectable = model.isAvailable !== false && !isPaused;
                          const statusLabel = model.status || (!isSelectable ? (isPaused ? "Paused" : "Offline") : null);

                          return (
                            <button
                              key={model.id}
                              type="button"
                              className={`picker-option ${isSelected ? "active" : ""} ${
                                !isSelectable ? "disabled" : ""
                              }`}
                              onClick={() => {
                                if (!isSelectable) return;
                                setSelectedModelId(model.id);
                                setShowModelPicker(false);
                              }}
                              disabled={!isSelectable}
                              title={
                                isPaused
                                  ? `${model.displayName} (Paused): Locked by administrator.`
                                  : !isSelectable
                                  ? `${model.displayName}: ${model.description}`
                                  : model.description
                              }
                            >
                              <Zap
                                size={15}
                                className={`model-icon ${isSelected ? "selected" : ""}`}
                              />
                              <div className="picker-option-text">
                                <div className="picker-option-header">
                                  <span className="picker-option-name">
                                    {model.displayName}
                                  </span>
                                  {statusLabel && statusLabel !== "Available" && (
                                    <span
                                      className={`offline-badge ${
                                        statusLabel === "Mock Mode"
                                          ? "mock-badge"
                                          : isPaused
                                          ? "paused-badge"
                                          : ""
                                      }`}
                                    >
                                      {statusLabel}
                                    </span>
                                  )}
                                </div>
                                <span className="picker-option-meta">
                                  {model.description}
                                </span>
                              </div>
                              {isSelected && <Check size={14} className="check-icon" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <span>Press Enter to send · Shift+Enter for new line</span>
          </div>
        </div>
      </main>

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete conversation?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="modal-btn danger"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CLEAR ALL CHATS MODAL ═══ */}
      {showClearAllModal && (
        <div className="modal-overlay" onClick={() => setShowClearAllModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Clear all chats?</h3>
            <p>Delete all conversations? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowClearAllModal(false)}>
                Cancel
              </button>
              <button className="modal-btn danger" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TURN OFF TEMPORARY CHAT CONFIRMATION MODAL ═══ */}
      {showTurnOffTempModal && (
        <div className="modal-overlay" onClick={() => setShowTurnOffTempModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2 text-amber-500 font-semibold">
              <Ghost size={18} />
              <h3 style={{ margin: 0 }}>Turn Off Temporary Chat?</h3>
            </div>
            <p style={{ marginTop: 8 }}>
              Are you sure you want to turn off Temporary Chat? This conversation is off-the-record, so all messages and content in this temporary session will be <strong>permanently lost</strong> and cannot be recovered.
            </p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowTurnOffTempModal(false)}>
                Cancel
              </button>
              <button
                className="modal-btn danger"
                onClick={() => {
                  setShowTurnOffTempModal(false);
                  confirmTurnOffTemporaryChat();
                }}
              >
                Turn Off & Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DISLIKE FEEDBACK MODAL ═══ */}
      <AnimatePresence>
        {feedbackModal && (
          <div className="feedback-modal-overlay" onClick={resetFeedbackModal}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
              className="feedback-modal-panel overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
              {feedbackStatus === "success" ? (
                <div className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                    className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20"
                  >
                    <CheckCircle2 size={32} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Feedback received</h3>
                  <p className="text-sm text-[var(--muted)] mb-6">Thanks for helping improve Nexus AI.</p>
                  <button
                    onClick={resetFeedbackModal}
                    className="px-6 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] font-semibold transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="feedback-modal-header">
                    <h3>Help improve this response</h3>
                    <button className="feedback-modal-close" onClick={resetFeedbackModal} disabled={feedbackStatus === "submitting"}><X size={16} /></button>
                  </div>
                  
                  {feedbackStatus === "error" && (
                    <div className="mx-5 mt-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-400 text-xs font-semibold">
                      <AlertTriangle size={14} />
                      Could not send feedback. Please try again.
                    </div>
                  )}

                  <div className="feedback-reasons">
                    {NEGATIVE_FEEDBACK_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        className={`feedback-reason-btn ${feedbackCategory === cat ? "active" : ""}`}
                        onClick={() => setFeedbackCategory(cat)}
                        disabled={feedbackStatus === "submitting"}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="feedback-modal-textarea"
                    placeholder="Tell us more (optional)"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows={2}
                    disabled={feedbackStatus === "submitting"}
                  />
                  <div className="feedback-modal-footer">
                    <button
                      className="feedback-modal-submit flex items-center justify-center gap-2"
                      onClick={() => handleFeedbackSubmit("negative")}
                      disabled={!feedbackCategory || feedbackStatus === "submitting"}
                    >
                      {feedbackStatus === "submitting" ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                          Submitting...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ CHATGPT-STYLE SHARE PROMPT / SHARE RESPONSE MODAL ═══ */}
      <AnimatePresence>
        {shareModalData && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setShareModalData(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.3 }}
              className="w-full max-w-[560px] bg-[#18181b] border border-[#2e2e33] rounded-[20px] p-6 sm:p-7 text-white shadow-2xl overflow-hidden flex flex-col gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {shareModalData.type === "prompt" ? "Share prompt" : (shareModalData.title || "IB Nexus")}
                </h2>
                <button
                  onClick={() => setShareModalData(null)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Preview Card (The Card Visual) */}
              <div className="relative w-full min-h-[240px] max-h-[320px] bg-gradient-to-b from-[#27272a] to-[#18181b] border border-white/10 rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-inner group">
                {/* Copy Snippet Button (Upper Right) */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareModalData.content);
                    setCardCopied(true);
                    setTimeout(() => setCardCopied(false), 2000);
                  }}
                  className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-sm opacity-90 hover:opacity-100"
                  title="Copy content"
                >
                  {cardCopied ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {/* Content Area */}
                <div className="overflow-y-auto pr-2 max-h-[220px] custom-scrollbar text-sm leading-relaxed">
                  {shareModalData.type === "prompt" ? (
                    <div className="flex justify-end pt-2 pb-6">
                      <div className="bg-[#2f2f32] text-white px-4 py-3 rounded-2xl rounded-tr-md max-w-[88%] shadow-md font-normal text-sm leading-snug">
                        {shareModalData.content}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 pb-6 text-zinc-200 font-mono text-[13px] leading-relaxed whitespace-pre-wrap word-break-break-word">
                      {shareModalData.content}
                    </div>
                  )}
                </div>

                {/* Brand Watermark (Bottom Right) */}
                <div className="flex items-center justify-end gap-1.5 pt-3 text-xs font-semibold text-white/70 tracking-wide select-none">
                  <img src="/brand/ib-nexus-icon.png" alt="Nexus AI" className="w-4 h-4 object-contain opacity-80" onError={(e) => { e.target.style.display = 'none'; }} />
                  <span>Nexus AI</span>
                </div>
              </div>

              {/* Social Sharing Actions */}
              <div className="flex items-center justify-center gap-6 sm:gap-8 pt-1">
                {/* Copy link */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareModalData.shareUrl);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="w-12 h-12 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                    title="Copy share link"
                  >
                    {shareCopied ? <Check size={20} className="text-emerald-300" /> : <Link2 size={20} />}
                  </button>
                  <span className="text-xs text-zinc-400 font-medium">
                    {shareCopied ? "Copied!" : "Copy link"}
                  </span>
                </div>

                {/* X */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => {
                      const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareModalData.shareUrl)}&text=${encodeURIComponent(shareModalData.title)}`;
                      window.open(url, "_blank", "width=600,height=400");
                    }}
                    className="w-12 h-12 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                    title="Share on X"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </button>
                  <span className="text-xs text-zinc-400 font-medium">X</span>
                </div>

                {/* LinkedIn */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => {
                      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareModalData.shareUrl)}`;
                      window.open(url, "_blank", "width=600,height=600");
                    }}
                    className="w-12 h-12 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                    title="Share on LinkedIn"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </button>
                  <span className="text-xs text-zinc-400 font-medium">LinkedIn</span>
                </div>

                {/* Reddit */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => {
                      const url = `https://www.reddit.com/submit?url=${encodeURIComponent(shareModalData.shareUrl)}&title=${encodeURIComponent(shareModalData.title)}`;
                      window.open(url, "_blank", "width=600,height=600");
                    }}
                    className="w-12 h-12 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                    title="Share on Reddit"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.056 1.598.04.27.06.544.06.824 0 3.328-3.957 6.02-8.837 6.02-4.88 0-8.837-2.692-8.837-6.02 0-.28.02-.554.06-.824A1.76 1.76 0 0 1 1.79 12.04c0-.968.786-1.754 1.754-1.754.477 0 .899.182 1.207.491 1.194-.856 2.85-1.419 4.674-1.488l.968-4.542 3.32.7a1.25 1.25 0 0 1 1.3-.703zM9.25 13.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm5.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm-5.467 4.19a.466.466 0 0 0-.329.796c.995.995 2.872 1.053 3.046 1.053.174 0 2.051-.058 3.046-1.053a.466.466 0 0 0-.659-.658c-.687.687-2.079.791-2.387.791-.308 0-1.7-.104-2.387-.791a.46.46 0 0 0-.33-.138z"/>
                    </svg>
                  </button>
                  <span className="text-xs text-zinc-400 font-medium">Reddit</span>
                </div>
              </div>

              {/* Footer Disclaimer */}
              <div className="text-center text-xs text-zinc-400/80 pt-1">
                Memory sources won't be shared with viewers.{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLearnMoreModal(true);
                  }}
                  className="underline hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Learn more
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ NEXUS AI PRIVACY & SHARED CONTENT LEARN MORE MODAL ═══ */}
      <AnimatePresence>
        {showLearnMoreModal && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowLearnMoreModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
              className="w-full max-w-[620px] bg-[#18181b] border border-[#2e2e33] rounded-[22px] p-6 sm:p-8 text-white shadow-2xl overflow-hidden flex flex-col gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Nexus AI Privacy & Shared Content
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      How IB Nexus protects your private memory, sessions, and study material.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLearnMoreModal(false)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 text-sm text-zinc-300 leading-relaxed overflow-y-auto max-h-[380px] custom-scrollbar pr-1">
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3 text-indigo-200 text-xs">
                  <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-white block mb-0.5">Privacy First Learning</strong>
                    IB Nexus AI is designed to simplify your revision while giving you complete ownership over what you store and share.
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-white text-xs sm:text-sm">Isolated Memory & Context</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        When you generate a share link for a prompt or response, only the specific content snippet shown in the preview is shared. Your custom memory sources, personal Knowledge Lens, notes, and account data remain strictly private and are never accessible to external viewers.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-white text-xs sm:text-sm">Off-the-Record Temporary Sessions</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        When Temporary Chat is enabled, your messages and AI responses are transient. They are never written to permanent database storage, never added to your sidebar history, and are completely purged when you end the session or turn off temporary chat.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-white text-xs sm:text-sm">Full Granular Control</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Sharing a snippet does not publish your entire chat history or allow third parties to view other prompts in your thread. You can copy or delete your chat history at any time.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-white text-xs sm:text-sm">Academic Guidance</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Nexus AI is built to clarify complex IB subjects (DP/MYP). AI outputs are designed for revision and understanding — please verify critical details against your IB subject guides and teacher notes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-400">
                <a
                  href="/privacy#ai-features"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
                >
                  Read Full IB Nexus Privacy Policy →
                </a>
                <button
                  onClick={() => setShowLearnMoreModal(false)}
                  className="px-5 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs transition-all cursor-pointer shadow-sm"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── Conversation item renderer ───────────────────────────
  function renderConversationItem(conv) {
    return (
      <div
        key={conv.id}
        className={`conv-item ${activeConversationId === conv.id ? "active" : ""}`}
      >
        {renameId === conv.id ? (
          <div className="conv-rename" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  handleRename(conv.id, e.target.value);
                }
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setRenameId(null);
                }
              }}
              onBlur={(e) => handleRename(conv.id, e.target.value)}
            />
          </div>
        ) : (
          <button
            className="conv-item-btn"
            onClick={() => selectConversation(conv.id)}
          >
            <MessageCircle size={14} />
            <span className="conv-item-title">{conv.title}</span>
            {conv.is_pinned && <Pin size={10} className="conv-pin-icon" />}
          </button>
        )}

        <div className="context-menu-container">
          <button
            className="conv-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu(contextMenu === conv.id ? null : conv.id);
            }}
          >
            <MoreHorizontal size={14} />
          </button>

          {contextMenu === conv.id && (
            <div
              ref={contextMenuRef}
              className="conv-context-menu"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePin(conv.id, !conv.is_pinned);
                }}
              >
                {conv.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                {conv.is_pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameId(conv.id);
                  setRenameValue(conv.title);
                  setContextMenu(null);
                }}
              >
                <Pencil size={14} /> Rename
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive(conv.id, true);
                }}
              >
                <Archive size={14} /> Archive
              </button>
              <button
                className="danger"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(conv.id);
                  setContextMenu(null);
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const workspaceStyles = `
  .msg-timestamp {
    font-size: 11px;
    color: var(--muted);
    margin-top: 6px;
    opacity: 0.8;
  }

  .ai-workspace {
    display: flex;
    height: calc(100vh - 72px);
    background: var(--background);
    color: var(--foreground);
    overflow: hidden;
    position: relative;
  }
  
  .ai-sidebar {
    width: 280px;
    min-width: 280px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden;
    z-index: 10;
  }
  .ai-sidebar.closed { width: 0; min-width: 0; padding: 0; border: none; }
  
  .sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px;
    gap: 8px;
    min-width: 256px;
  }
  
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 9;
  }
  
  @media (max-width: 768px) {
    .ai-sidebar {
      position: fixed;
      left: -300px;
      top: 64px;
      bottom: 0;
      z-index: 20;
    }
    .ai-sidebar.mobile-open { left: 0; }
  }
  
  .new-chat-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px dashed rgba(99,102,241,0.4);
    background: rgba(99,102,241,0.08);
    color: var(--accent);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .new-chat-btn:hover {
    background: rgba(99,102,241,0.15);
    border-color: rgba(99,102,241,0.6);
  }

  /* Temporary Chat Sidebar Toggle */
  .temporary-chat-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .temporary-chat-toggle-btn:hover {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  }
  .temporary-chat-toggle-btn.active {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.4);
    color: #f59e0b;
  }
  .temp-toggle-switch {
    width: 28px;
    height: 16px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.18);
    position: relative;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }
  .temp-toggle-switch.on {
    background: #f59e0b;
  }
  .temp-toggle-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s ease;
  }
  .temp-toggle-switch.on::after {
    transform: translateX(12px);
  }

  /* Temporary Chat Banner */
  .temporary-chat-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 18px;
    background: rgba(245, 158, 11, 0.08);
    border-bottom: 1px solid rgba(245, 158, 11, 0.25);
    backdrop-filter: blur(12px);
    color: #fef3c7;
    font-size: 12px;
    z-index: 5;
  }
  .temp-banner-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .temp-banner-icon {
    color: #f59e0b;
    flex-shrink: 0;
  }
  .temp-banner-close {
    background: rgba(245, 158, 11, 0.18);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #f59e0b;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .temp-banner-close:hover {
    background: rgba(245, 158, 11, 0.3);
    color: #fff;
  }

  /* Header Temp Badge */
  .header-temp-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 12px;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #f59e0b;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  
  .sidebar-search {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--hover);
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .sidebar-search input {
    background: none;
    border: none;
    color: var(--foreground);
    font-size: 12px;
    flex: 1;
    outline: none;
  }
  .sidebar-search input::placeholder { color: var(--muted); }
  .search-clear {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 2px;
  }
  
  .conversation-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .conversation-list::-webkit-scrollbar { width: 4px; }
  .conversation-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .sidebar-footer {
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
.clear-all-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(239,68,68,0.2);
  background: rgba(239,68,68,0.05);
  color: #ef4444;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.clear-all-btn:hover {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.4);
}

.conv-group { margin-bottom: 8px; }
.conv-group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 2px;
  border-radius: 8px;
  transition: all 0.15s;
  position: relative;
}
.conv-item:active:not(:has(.conv-context-menu)) { transform: scale(0.97); }
.conv-item:hover { background: var(--hover); }
.conv-item.active { background: rgba(99,102,241,0.12); }

.conv-item-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 12.5px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
}
.conv-item.active .conv-item-btn { color: var(--foreground); }
.conv-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.conv-pin-icon { color: var(--accent); flex-shrink: 0; }

.conv-more-btn {
  padding: 4px;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  opacity: 0;
  border-radius: 4px;
  transition: opacity 0.15s;
}
.conv-item:hover .conv-more-btn { opacity: 1; }
.conv-more-btn:hover { background: var(--hover); color: var(--foreground); }

.conv-rename input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid rgba(99,102,241,0.4);
  border-radius: 6px;
  background: var(--input);
  color: var(--foreground);
  font-size: 12.5px;
  outline: none;
}

.conv-context-menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 50;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
  min-width: 140px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  animation: fadeIn 0.15s ease;
}
.conv-context-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.1s;
}
.conv-context-menu button:hover { background: var(--border); }
.conv-context-menu button.danger { color: #ef4444; }
.conv-context-menu button.danger:hover { background: rgba(248,113,113,0.1); }

.sidebar-loading, .sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--muted);
  font-size: 12px;
}

.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(99,102,241,0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(12px);
  gap: 12px;
}
.ai-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sidebar-toggle {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
}
.sidebar-toggle:hover { background: var(--border); color: var(--foreground); }

.ai-title-area {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.header-brand-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}
.ai-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
}
.ai-conv-title {
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
}

.picker-container { position: relative; }

.model-selector-btn {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.15s;
}
.model-selector-btn:active { transform: scale(0.97); }
.model-selector-btn:hover {
  background: var(--border);
  color: var(--text-secondary);
}
.model-chevron {
  transition: transform 0.2s ease;
}
.model-chevron.open {
  transform: rotate(180deg);
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 100;
  min-width: 280px;
  max-width: 340px;
  max-height: 400px;
  overflow-y: auto;
  background: rgba(22, 22, 40, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}
.picker-dropdown::-webkit-scrollbar { width: 4px; }
.picker-dropdown::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.picker-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}
.picker-section:last-child { margin-bottom: 0; }

.picker-section-label {
  padding: 6px 10px 4px 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.picker-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12.5px;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  transition: background 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out;
  outline: none;
}
.picker-option:hover:not(:disabled) {
  background: var(--border);
  color: #f1f5f9;
}
.picker-option.active {
  background: rgba(99, 102, 241, 0.14);
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--foreground);
}
.picker-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.picker-option-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.picker-option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.picker-option-name { font-weight: 600; color: #f1f5f9; }
.picker-option-meta {
  font-size: 10.5px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.picker-option.active .picker-option-meta { color: #a5b4fc; }

.model-icon { color: var(--muted); flex-shrink: 0; transition: color 0.12s ease-out; }
.picker-option:hover .model-icon { color: var(--accent); }
.model-icon.selected { color: var(--accent); }
.check-icon { color: var(--accent); flex-shrink: 0; }

.offline-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.offline-badge.paused-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.offline-badge.mock-badge {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.ai-chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  position: relative;
  scroll-behavior: smooth;
}
.ai-chat-area::-webkit-scrollbar { width: 6px; }
.ai-chat-area::-webkit-scrollbar-thumb { background: var(--hover); border-radius: 3px; }

.ai-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 24px;
  min-height: 100%;
}
.ai-welcome-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(99,102,241,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 1px solid rgba(99,102,241,0.2);
}
.welcome-brand-logo {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}
.ai-welcome h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--foreground);
  margin-bottom: 4px;
}
.ai-welcome-sub {
  font-size: 13px;
  color: var(--accent);
  font-weight: 500;
  margin-bottom: 8px;
}
.ai-welcome-desc {
  font-size: 13px;
  color: var(--muted);
  max-width: 460px;
  line-height: 1.6;
  margin-bottom: 32px;
}

.ai-suggestions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
  width: 100%;
  max-width: 560px;
}
.ai-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--hover);
  color: var(--text-secondary);
  font-size: 12.5px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.ai-suggestion:hover {
  background: var(--hover);
  border-color: rgba(99,102,241,0.3);
}

.ai-messages {
  padding: 20px 0;
}

.ai-message {
  display: flex;
  gap: 12px;
  padding: 12px 24px;
  transition: background 0.15s;
}
.ai-message:hover { background: var(--hover); }

.ai-message.user-msg { justify-content: flex-start; }

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  overflow: hidden;
  background: var(--hover);
}
.user-msg .msg-avatar {
  background: rgba(99,102,241,0.15);
  color: var(--accent);
}
.ai-msg .msg-avatar {
  background: transparent;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.avatar-img.nexus-logo {
  object-fit: cover;
  border-radius: 50%;
}

.msg-content {
  flex: 1;
  min-width: 0;
  max-width: 760px;
}

/* Attachments Layout in Messages */
.msg-attachments-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.msg-attachment-image-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--hover);
  border: 1px solid var(--hover);
  border-radius: 12px;
  padding: 8px;
  max-width: 380px;
}
.msg-attachment-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(99,102,241,0.1);
  width: fit-content;
}
.msg-attachment-preview-img {
  width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: 8px;
  background: #000;
}
.msg-attachment-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: var(--muted);
  font-size: 12px;
}

.msg-attachment-doc-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--hover);
  border: 1px solid var(--hover);
  border-radius: 10px;
  max-width: 360px;
}
.doc-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(99,102,241,0.15);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.doc-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.doc-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.doc-card-sub {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}

.msg-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--foreground);
  word-break: break-word;
}
.user-msg .msg-text {
  background: rgba(99,102,241,0.08);
  padding: 10px 14px;
  border-radius: 12px;
  border-top-left-radius: 4px;
  display: inline-block;
}

.ai-rendered { color: var(--foreground); }
.ai-rendered p { margin: 0 0 8px; }
.ai-rendered .ai-h2 { font-size: 18px; font-weight: 700; margin: 16px 0 8px; color: #f1f5f9; }
.ai-rendered .ai-h3 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; color: #f1f5f9; }
.ai-rendered .ai-h4 { font-size: 13.5px; font-weight: 600; margin: 12px 0 4px; color: #f1f5f9; }
.ai-rendered strong { color: #f1f5f9; font-weight: 600; }
.ai-rendered em { color: #c4b5fd; }
.ai-rendered .ai-ul, .ai-rendered .ai-ol {
  margin: 8px 0;
  padding-left: 20px;
}
.ai-rendered .ai-li, .ai-rendered .ai-li-ordered {
  margin: 3px 0;
  line-height: 1.6;
}
.ai-rendered .ai-inline-code {
  background: rgba(99,102,241,0.12);
  color: #c4b5fd;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12.5px;
  font-family: 'JetBrains Mono', monospace;
}
.ai-rendered .ai-code-block {
  position: relative;
  margin: 12px 0;
  border-radius: 10px;
  overflow: hidden;
  background: #0d0d1a;
  border: 1px solid var(--border);
}
.ai-rendered .ai-code-lang {
  padding: 4px 12px;
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  background: rgba(99,102,241,0.08);
}
.ai-rendered .ai-code-block pre {
  padding: 12px;
  margin: 0;
  overflow-x: auto;
}
.ai-rendered .ai-code-block code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--foreground);
  line-height: 1.6;
}
.ai-rendered .ai-table-wrapper {
  overflow-x: auto;
  margin: 12px 0;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.ai-rendered .ai-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.ai-rendered .ai-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--hover);
}
.ai-rendered .ai-table tr:first-child td {
  font-weight: 600;
  color: #f1f5f9;
  background: rgba(99,102,241,0.06);
}
.ai-rendered .ai-hr {
  border: none;
  height: 1px;
  background: var(--border);
  margin: 16px 0;
}

.msg-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}
.ai-message:hover .msg-actions { opacity: 1; }

.msg-action-btn {
  padding: 4px 6px;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.msg-action-btn:active { transform: scale(0.92); }
.msg-action-btn:hover { background: var(--border); color: var(--foreground); }
.msg-action-btn.done { color: #10b981; }

.msg-model-badge {
  font-size: 10px;
  color: var(--muted);
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--hover);
  margin-left: 4px;
}
.streaming-badge {
  animation: pulse 1.5s ease-in-out infinite;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.thinking-ball {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--foreground);
  animation: breathingBall 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes breathingBall {
  0%, 100% {
    transform: scale(0.5);
    opacity: 0.3;
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.2);
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
    box-shadow: 0 0 14px rgba(255, 255, 255, 0.8), 0 0 24px rgba(99, 102, 241, 0.4);
  }
}

.ai-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  color: #ef4444;
  font-size: 12.5px;
  background: rgba(248,113,113,0.06);
  margin: 0 24px;
  border-radius: 8px;
}
.retry-split-container {
  position: relative;
  margin-left: auto;
}
.retry-split-btn-group {
  display: flex;
  align-items: center;
}
.retry-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid rgba(248,113,113,0.3);
  border-radius: 6px;
  background: none;
  color: #ef4444;
  font-size: 11px;
  cursor: pointer;
}
.retry-main-btn {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
  padding: 4px 8px 4px 10px;
}
.retry-chevron-btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  padding: 4px 6px;
  border-left: 1px solid rgba(248,113,113,0.2);
}
.retry-btn:hover { background: rgba(248,113,113,0.1); }
.retry-chevron-btn:hover, .retry-chevron-btn.active {
  background: rgba(248,113,113,0.15);
}
.error-model-dropdown {
  min-width: 260px;
  max-height: 280px;
  overflow-y: auto;
  z-index: 60;
}

.scroll-bottom-btn {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(8px);
  color: var(--accent);
  font-size: 11px;
  cursor: pointer;
  z-index: 5;
  transition: all 0.2s;
  box-shadow: 0 4px 16px var(--input);
}
.scroll-bottom-btn:hover { background: rgba(99,102,241,0.15); }

.composer-attachments-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.composer-attachment-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.3);
  border-radius: 8px;
  color: #c4b5fd;
  font-size: 11.5px;
}
.chip-name {
  font-weight: 500;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chip-size {
  font-size: 10px;
  color: var(--accent);
}
.chip-remove {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 4px;
}
.chip-remove:hover { color: #ef4444; background: var(--border); }

.ai-composer {
  padding: 12px 24px 16px;
  border-top: 1px solid var(--hover);
  background: var(--surface);
}
.composer-inner {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid var(--hover);
  background: var(--hover);
  transition: border-color 0.15s;
}
.composer-inner:focus-within {
  border-color: rgba(99,102,241,0.4);
}

.composer-textarea {
  flex: 1;
  background: none;
  border: none;
  color: var(--foreground);
  font-size: 13.5px;
  line-height: 1.5;
  resize: none;
  outline: none;
  max-height: 180px;
  min-height: 20px;
  font-family: inherit;
}
.composer-textarea::placeholder { color: var(--muted); }
.composer-textarea:disabled { opacity: 0.5; }

.composer-actions { display: flex; align-items: center; gap: 4px; }

.composer-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.composer-btn:active:not(:disabled) { transform: scale(0.92); }
.attach-btn {
  background: none;
  color: var(--muted);
}
.attach-btn:hover:not(:disabled) {
  background: var(--border);
  color: var(--foreground);
}
.send-btn {
  background: rgba(99,102,241,0.1);
  color: var(--muted);
}
.send-btn.active { background: var(--accent); color: #ffffff;
}
.send-btn.active:hover { background: var(--accent); }
.stop-btn {
  background: rgba(248,113,113,0.15);
  color: #ef4444;
}
.stop-btn:hover { background: rgba(248,113,113,0.25); }

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  font-size: 10px;
  color: var(--muted);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.15s ease;
}
.modal-content {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.modal-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 8px;
}
.modal-content p {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 16px;
}
.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.modal-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.modal-btn.cancel {
  background: var(--border);
  color: var(--muted);
}
.modal-btn.cancel:hover { background: var(--border); }
.modal-btn.danger {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}
.modal-btn.danger:hover { background: rgba(239,68,68,0.25); }
.modal-btn.primary { background: var(--accent); color: #ffffff;
}
.modal-btn.primary:hover { background: var(--accent); }
.modal-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ═══ DISLIKE MODAL (New Elegant) ═══ */
.feedback-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 250;
  animation: fadeIn 0.15s ease;
}

.feedback-modal-panel {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  animation: slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDownFade {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.feedback-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.feedback-modal-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
  margin: 0;
}

.feedback-modal-close {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.feedback-modal-close:hover {
  background: var(--hover);
  color: var(--foreground);
}

.feedback-reasons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.feedback-reason-btn {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}
.feedback-reason-btn:hover { background: var(--hover); }
.feedback-reason-btn.active {
  border-color: rgba(99,102,241,0.5);
  background: rgba(99,102,241,0.1);
  color: var(--foreground);
  font-weight: 500;
}

.feedback-modal-textarea {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--foreground);
  font-size: 13px;
  resize: none;
  outline: none;
  margin-bottom: 16px;
  font-family: inherit;
}
.feedback-modal-textarea:focus {
  border-color: rgba(99,102,241,0.4);
}
.feedback-modal-textarea::placeholder { color: var(--muted); }

.feedback-modal-footer {
  display: flex;
  justify-content: flex-end;
}

.feedback-modal-submit {
  padding: 8px 16px;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.feedback-modal-submit:hover { opacity: 0.9; }
.feedback-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;
