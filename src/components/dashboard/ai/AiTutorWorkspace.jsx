"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, Send, MessageCircle, Plus, Search, Pin, PinOff,
  Pencil, Trash2, Archive, MoreHorizontal, ChevronDown, X,
  Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Square,
  Bot, User, Zap, Menu, ChevronRight, AlertCircle, ArrowDown,
  Paperclip, Image as ImageIcon, FileText, Trash, Volume2, VolumeX
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
  "Incorrect",
  "Irrelevant",
  "Too difficult",
  "Too simple",
  "Wrong IB information",
  "Out of context",
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
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackCategory, setFeedbackCategory] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittedFeedback, setSubmittedFeedback] = useState(new Set());

  // State: scroll
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // State: TTS
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // Refs
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const modelPickerRef = useRef(null);

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
          const defaultModel = modelData.models.find(m => m.isDefault) || modelData.models[0];
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

  // ─── Close dropdowns on outside click ─────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
        setShowModelPicker(false);
      }
      if (contextMenu && !e.target.closest(".context-menu-container")) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

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

  // ─── New Chat ──────────────────────────────────────────────
  const handleNewChat = useCallback(async () => {
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
  }, [selectedModelId]);

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

  // ─── Retry last message ───────────────────────────────────
  const handleRetry = useCallback(() => {
    if (messages.length < 1) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;

    const idx = messages.length - 1 - lastUserIndex;
    const lastUserMsg = messages[idx];

    setMessages((prev) => prev.slice(0, idx));
    setInput(lastUserMsg.content || "");
    if (lastUserMsg.attachments) {
      setComposerAttachments(lastUserMsg.attachments);
    }
    setErrorMsg(null);
  }, [messages]);

  // ─── Copy message ──────────────────────────────────────────
  const handleCopy = useCallback((text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  // ─── Feedback ──────────────────────────────────────────────
  const handleFeedbackSubmit = useCallback(
    async (rating) => {
      if (!feedbackModal) return;

      const payload = {
        action: "feedback",
        conversationId: activeConversationId,
        messageId: feedbackModal.id || null,
        rating,
        category: feedbackCategory,
        comment: feedbackComment,
        modelId: feedbackModal.model_id || selectedModelId,
      };

      try {
        await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSubmittedFeedback((prev) => new Set([...prev, feedbackModal.id || "unknown"]));
      } catch {}

      setFeedbackModal(null);
      setFeedbackCategory(null);
      setFeedbackComment("");
    },
    [feedbackModal, feedbackCategory, feedbackComment, activeConversationId, selectedModelId]
  );

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

    // 2. Execute backend deletion
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
    try {
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pin", conversationId: convId, isPinned }),
      });
    } catch {}
    setContextMenu(null);
  }, []);

  const handleRename = useCallback(async (convId) => {
    if (!renameValue.trim()) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: renameValue } : c))
    );
    setRenameId(null);
    try {
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", conversationId: convId, title: renameValue }),
      });
    } catch {}
    setRenameValue("");
  }, [renameValue]);

  const handleArchive = useCallback(async (convId, isArchived) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    delete messagesCache.current[convId];
    if (activeConversationId === convId) {
      setActiveConversationId(null);
      setMessages([]);
    }
    try {
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", conversationId: convId, isArchived }),
      });
    } catch {}
    setContextMenu(null);
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
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={18} />
            <span>New Chat</span>
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
            </div>
          </div>
        </header>

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
                    className={`ai-message ${msg.role === "user" ? "user-msg" : "ai-msg"}`}
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
                        msg.content ? <div className="msg-text">{msg.content}</div> : null
                      ) : (
                        <div
                          className="msg-text ai-rendered"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(msg.content),
                          }}
                        />
                      )}

                      {/* Message Timestamp */}
                      <div className="msg-timestamp" style={{ display: 'block', width: '100%', textAlign: msg.role === 'user' ? 'right' : 'left', marginTop: '4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
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

                      {/* Message actions */}
                      {msg.role === "assistant" && (
                        <div className="msg-actions">
                          <button
                            className="msg-action-btn"
                            onClick={() => handleCopy(msg.content, i)}
                            title="Copy"
                          >
                            {copiedIndex === i ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                          
                          <button
                            className={`msg-action-btn ${speakingMsgId === (msg.id || "msg-" + i) ? "done" : ""}`}
                            onClick={() => handleSpeak(msg.id || "msg-" + i, msg.content)}
                            title={speakingMsgId === (msg.id || "msg-" + i) ? "Stop speaking" : "Read aloud"}
                          >
                            {speakingMsgId === (msg.id || "msg-" + i) ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          </button>

                          <button
                            className={`msg-action-btn ${submittedFeedback.has(msg.id) ? "done" : ""}`}
                            onClick={() => {
                              handleFeedbackSubmit("positive");
                              setSubmittedFeedback((prev) => new Set([...prev, msg.id || "msg-" + i]));
                            }}
                            title="Good response"
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            className="msg-action-btn"
                            onClick={() => setFeedbackModal(msg)}
                            title="Report issue"
                          >
                            <ThumbsDown size={13} />
                          </button>

                          {actualName && (
                            <span className="msg-model-badge">
                              {actualName}
                            </span>
                          )}
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
                  <button onClick={handleRetry} className="retry-btn">
                    <RefreshCw size={14} /> Retry
                  </button>
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
                          const isAvailable = model.isAvailable !== false;
                          const statusLabel = model.status || (!isAvailable ? "Offline" : null);

                          return (
                            <button
                              key={model.id}
                              type="button"
                              className={`picker-option ${isSelected ? "active" : ""} ${
                                !isAvailable ? "disabled" : ""
                              }`}
                              onClick={() => {
                                if (!isAvailable) return;
                                setSelectedModelId(model.id);
                                setShowModelPicker(false);
                              }}
                              disabled={!isAvailable}
                              title={
                                !isAvailable
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
                                        statusLabel === "Mock Mode" ? "mock-badge" : ""
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

      {/* ═══ FEEDBACK MODAL ═══ */}
      {feedbackModal && (
        <div className="modal-overlay" onClick={() => setFeedbackModal(null)}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <h3>What went wrong?</h3>
            <div className="feedback-categories">
              {NEGATIVE_FEEDBACK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`feedback-cat-btn ${feedbackCategory === cat ? "active" : ""}`}
                  onClick={() => setFeedbackCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <textarea
              className="feedback-textarea"
              placeholder="Additional comments (optional)"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              rows={3}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setFeedbackModal(null)}>
                Cancel
              </button>
              <button
                className="modal-btn primary"
                onClick={() => handleFeedbackSubmit("negative")}
                disabled={!feedbackCategory}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
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
          <div className="conv-rename">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(conv.id);
                if (e.key === "Escape") setRenameId(null);
              }}
              onBlur={() => handleRename(conv.id)}
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
            <div className="conv-context-menu">
              <button onClick={() => handlePin(conv.id, !conv.is_pinned)}>
                {conv.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                {conv.is_pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => {
                  setRenameId(conv.id);
                  setRenameValue(conv.title);
                  setContextMenu(null);
                }}
              >
                <Pencil size={14} /> Rename
              </button>
              <button onClick={() => handleArchive(conv.id, true)}>
                <Archive size={14} /> Archive
              </button>
              <button
                className="danger"
                onClick={() => {
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
  transition: background 0.15s;
  position: relative;
}
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
  transition: all 0.2s;
}
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
  margin-left: auto;
}
.retry-btn:hover { background: rgba(248,113,113,0.1); }

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
  transition: border-color 0.2s;
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
  transition: all 0.2s;
}
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

.feedback-modal { max-width: 420px; }
.feedback-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.feedback-cat-btn {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--hover);
  background: var(--hover);
  color: var(--muted);
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.15s;
}
.feedback-cat-btn:hover { background: var(--border); }
.feedback-cat-btn.active {
  border-color: rgba(99,102,241,0.4);
  background: rgba(99,102,241,0.12);
  color: var(--accent);
}
.feedback-textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--hover);
  background: var(--hover);
  color: var(--foreground);
  font-size: 12.5px;
  resize: none;
  outline: none;
  margin-bottom: 12px;
  font-family: inherit;
}
.feedback-textarea::placeholder { color: var(--muted); }

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
