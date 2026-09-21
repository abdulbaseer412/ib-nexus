"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  Sparkles,
  Send,
  GraduationCap,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Copy,
  Check,
  User,
  Bot,
  Trash2,
  Paperclip,
  X,
  Clock,
  Edit2,
  Search,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  ArrowDown,
  Cpu,
} from "lucide-react";
import {
  fetchConversationsAction,
  createConversationAction,
  saveMessageAction,
  fetchConversationMessagesAction,
  deleteConversationAction,
} from "@/app/dashboard/ai/chat-actions";
import { getClientModels } from "@/lib/ai/models";

const SUGGESTED_PROMPTS = [
  { prompt: "Explain the Krebs Cycle step by step", subject: "Biology" },
  { prompt: "Help me structure my TOK essay", subject: "TOK" },
  { prompt: "Generate practice questions for Chemical Bonding", subject: "Chemistry" },
  { prompt: "Summarise the causes of World War I", subject: "History" },
];

const SUBJECT_COLOR_BARS = {
  Biology: "#10b981",
  Chemistry: "#f59e0b",
  Mathematics: "#4f8cff",
  Economics: "#8b5cf6",
  English: "#ec4899",
  Physics: "#0ea5e9",
  TOK: "#f43f5e",
  History: "#a855f7",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function AiTutorClient({ userProfile }) {
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All subjects");
  const [selectedModelId, setSelectedModelId] = useState("gemini-3.6-flash");
  const [actualUsedModelLabel, setActualUsedModelLabel] = useState("Gemini 3.6 Flash");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Model Registry options
  const availableModels = getClientModels();

  // Persistence State
  const [recentChats, setRecentChats] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Attachment State
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  // Scroll Management
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const isUserScrolledUp = useRef(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const res = await fetchConversationsAction();
    if (res.success) {
      setRecentChats(res.conversations || []);
    }
  }

  // Handle scroll position & smooth follow
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 100) {
      isUserScrolledUp.current = true;
      setShowScrollDown(true);
    } else {
      isUserScrolledUp.current = false;
      setShowScrollDown(false);
    }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      isUserScrolledUp.current = false;
      setShowScrollDown(false);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current && !isUserScrolledUp.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // File Selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg("File is too large. Maximum allowed size is 5MB.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("Unsupported file format. Please upload PDF, TXT, or images (JPG/PNG/WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result.split(",")[1];
      setAttachment({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64String,
      });
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Send Message Flow
  const handleSendMessage = async (overrideContent = null) => {
    const textToSend = overrideContent || input;
    if (!textToSend.trim() && !attachment) return;
    if (isGenerating) return;

    setErrorMsg(null);

    const userMsg = {
      role: "user",
      content: textToSend.trim(),
      attachment: attachment ? { ...attachment } : null,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachment(null);
    setIsGenerating(true);
    isUserScrolledUp.current = false;

    // Save to DB if persistent chat session
    let activeConvId = currentConversationId;
    if (!isTemporaryChat) {
      if (!activeConvId) {
        const title = textToSend.trim()
          ? textToSend.substring(0, 32) + (textToSend.length > 32 ? "..." : "")
          : attachment
          ? attachment.name
          : "New Study Session";
        const res = await createConversationAction(title);
        if (res.success) {
          activeConvId = res.conversation.id;
          setCurrentConversationId(activeConvId);
          await loadConversations();
        }
      }

      if (activeConvId) {
        const dbContent = userMsg.attachment
          ? `[Attached: ${userMsg.attachment.name}]\n\n${userMsg.content}`
          : userMsg.content;
        await saveMessageAction(activeConvId, "user", dbContent);
      }
    }

    const assistantMsg = {
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
        attachment: m.attachment
          ? {
              mimeType: m.attachment.type,
              data: m.attachment.data,
            }
          : undefined,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          subjectFilter: selectedSubject,
          modelId: selectedModelId,
          conversationId: activeConvId,
        }),
      });

      if (!response.ok) {
        let errJson = {};
        try {
          errJson = await response.json();
        } catch {}
        throw new Error(errJson.error || `Server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "metadata" && parsed.modelDisplayName) {
                setActualUsedModelLabel(parsed.modelDisplayName);
              }
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                assistantText += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantText,
                  };
                  return updated;
                });
              }
            } catch (e) {
              if (e.message && !e.message.includes("Unexpected token")) throw e;
            }
          }
        }
      }

      if (!isTemporaryChat && activeConvId && assistantText) {
        await saveMessageAction(activeConvId, "model", assistantText);
      }
    } catch (err) {
      console.error("[AiTutorClient] Error sending message:", err);
      setErrorMsg(err.message || "Failed to generate AI response. Please try again.");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectConversation = async (convId) => {
    if (isGenerating) return;
    setIsTemporaryChat(false);
    setCurrentConversationId(convId);
    setMessages([]);
    setIsGenerating(true);
    setErrorMsg(null);
    setAttachment(null);

    const res = await fetchConversationMessagesAction(convId);
    if (res.success) {
      const formatted = res.messages.map((m) => ({
        role: m.role === "model" ? "assistant" : "user",
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));
      setMessages(formatted);
    } else {
      setErrorMsg("Failed to load conversation history.");
    }
    setIsGenerating(false);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat session?")) {
      startTransition(async () => {
        await deleteConversationAction(convId);
        if (currentConversationId === convId) {
          handleNewChat();
        }
        await loadConversations();
      });
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setErrorMsg(null);
    setAttachment(null);
    setIsTemporaryChat(false);
  };

  const handleTemporaryChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setErrorMsg(null);
    setAttachment(null);
    setIsTemporaryChat(true);
  };

  const filteredChats = recentChats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userSubjects = userProfile?.subjects?.map((s) => s.name) || [];
  const displaySubjects = [
    "All subjects",
    ...userSubjects,
    "Biology",
    "Chemistry",
    "Mathematics",
    "Economics",
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-4 sm:p-8 max-w-7xl mx-auto flex flex-col text-slate-100">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-[var(--foreground)]">
              IB Nexus AI Tutor
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
              <Cpu size={14} />
              <span>{actualUsedModelLabel}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Powered by active Admin Training rules & personalized IB subject context.
          </p>
        </div>

        {/* Model Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Model:</span>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--foreground)] font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} ({m.tier})
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex-1 grid gap-6 lg:grid-cols-[280px_1fr] overflow-hidden min-h-[600px] max-h-[800px]">
        {/* Sidebar Column: Conversations */}
        <aside className="card border border-[var(--border)] bg-[var(--card)] shadow-lg rounded-3xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] space-y-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-xs shadow-md hover:bg-indigo-600 transition-colors"
            >
              <Sparkles size={15} /> New Chat
            </button>
            <button
              onClick={handleTemporaryChat}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors ${
                isTemporaryChat
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-amber-500 hover:border-amber-500/30"
              }`}
            >
              <ShieldAlert size={14} /> Temporary Chat (Private)
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-xs rounded-xl py-2 pl-9 pr-3 outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {recentChats.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--muted)] px-4">
                No saved conversations.
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectConversation(chat.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors group ${
                    currentConversationId === chat.id
                      ? "bg-[var(--surface-hover)] border border-[var(--border)]"
                      : "hover:bg-[var(--surface-hover)] border border-transparent"
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <span
                      className={`text-xs font-medium truncate transition-colors ${
                        currentConversationId === chat.id
                          ? "text-[var(--accent)]"
                          : "text-[var(--foreground)] group-hover:text-[var(--accent)]"
                      }`}
                    >
                      {chat.title}
                    </span>
                    <span className="text-[10px] text-[var(--muted)] flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {new Date(chat.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, chat.id)}
                    className="p-1.5 text-[var(--muted)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-rose-500/10"
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Chat & Input Column */}
        <section className="flex flex-col h-full card border border-[var(--border-strong)] bg-[var(--card)] shadow-xl rounded-3xl relative overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-alt)]/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <GraduationCap size={18} className="text-[var(--accent)] shrink-0" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-transparent text-sm font-bold text-[var(--foreground)] outline-none border-none focus:ring-0 cursor-pointer"
              >
                {displaySubjects.map((s) => (
                  <option key={s} value={s} className="bg-[var(--card)] text-[var(--foreground)]">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {isTemporaryChat && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20 animate-pulse">
                <ShieldAlert size={12} /> Temporary Session
              </div>
            )}
          </div>

          {/* Chat Display Window */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar relative"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[var(--accent)] to-indigo-500 blur-xl opacity-30 animate-pulse" />
                  <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl">
                    <Sparkles size={28} className="text-[var(--accent)]" />
                  </div>
                </div>
                <div className="space-y-2 max-w-md">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">
                    {isTemporaryChat ? "Temporary Study Session" : "Start your study conversation"}
                  </h2>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    {isTemporaryChat
                      ? "Messages in this chat session are private and will not enter persistent history."
                      : "Ask about any IB topic, upload PDFs, or get step-by-step solutions."}
                  </p>
                </div>

                {!isTemporaryChat && (
                  <div className="grid gap-2.5 sm:grid-cols-2 w-full max-w-2xl mt-6">
                    {SUGGESTED_PROMPTS.map(({ prompt, subject }) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setSelectedSubject(subject);
                          handleSendMessage(prompt);
                        }}
                        className="group flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-all text-left text-xs font-medium text-[var(--foreground)] shadow-sm"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: SUBJECT_COLOR_BARS[subject] || "var(--accent)" }}
                        />
                        <span className="line-clamp-1 flex-1">{prompt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      isUser ? "justify-end" : "justify-start"
                    } animate-in fade-in slide-in-from-bottom-2 duration-200`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                        <Bot size={16} className="text-primary" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? "bg-indigo-600 text-white font-medium rounded-tr-none shadow-lg shadow-indigo-600/10"
                            : "bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-none shadow-sm font-sans"
                        }`}
                      >
                        {isUser && msg.attachment && (
                          <div className="flex items-center gap-2 bg-hover p-2.5 rounded-xl border border-subtle mb-3">
                            {msg.attachment.type.includes("image") ? (
                              <ImageIcon size={16} className="text-indigo-300" />
                            ) : (
                              <FileText size={16} className="text-rose-300" />
                            )}
                            <span className="text-xs font-semibold truncate">{msg.attachment.name}</span>
                          </div>
                        )}

                        {msg.content || (
                          <div className="flex items-center gap-2 text-[var(--muted)] italic">
                            <RefreshCw size={14} className="animate-spin text-[var(--accent)]" />
                            <span>Generating response...</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 px-1 text-[10px] text-[var(--muted)]">
                        <span>{msg.timestamp}</span>
                        {!isUser && msg.content && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              setCopiedIndex(index);
                              setTimeout(() => setCopiedIndex(null), 2000);
                            }}
                            className="hover:text-[var(--foreground)] transition-colors"
                          >
                            {copiedIndex === index ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0">
                        <User size={16} className="text-[var(--accent)]" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Floating Scroll Down Button if User Scrolled Up */}
          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-20 right-6 bg-indigo-600 hover:bg-indigo-500 text-primary_PROTECTED p-2.5 rounded-full shadow-xl border border-white/20 transition-all flex items-center gap-1.5 text-xs font-bold z-10 animate-bounce"
            >
              <ArrowDown size={14} /> New response
            </button>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="px-4 py-3 bg-rose-950/90 border-t border-rose-500/40 flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Composer */}
          <div className="border-t border-[var(--border)] p-3 sm:p-4 bg-[var(--surface-alt)]/30 backdrop-blur-md flex flex-col">
            {/* Attachment Preview */}
            {attachment && (
              <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] p-2 rounded-xl mb-3 w-max max-w-[80%] animate-in fade-in zoom-in-95">
                <div
                  className={`p-2 rounded-lg ${
                    attachment.type.includes("image")
                      ? "bg-indigo-500/10 text-indigo-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {attachment.type.includes("image") ? <ImageIcon size={18} /> : <FileText size={18} />}
                </div>
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-xs font-bold text-[var(--foreground)] truncate">
                    {attachment.name}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  onClick={() => setAttachment(null)}
                  className="p-1.5 hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-500 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="relative flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="application/pdf,text/plain,image/jpeg,image/png,image/webp"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="h-11 w-11 shrink-0 flex items-center justify-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--accent)] text-[var(--muted)] transition-colors"
                title="Attach PDF, Image, or Document"
              >
                <Paperclip size={18} />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isGenerating}
                rows={2}
                className="field w-full p-3.5 text-xs sm:text-sm resize-none rounded-2xl bg-[var(--card)] border border-[var(--border)] focus:border-[var(--accent)] transition-all outline-none"
                placeholder={
                  isTemporaryChat
                    ? "Ask anything (Private session)..."
                    : `Ask about ${selectedSubject}...`
                }
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={isGenerating || (!input.trim() && !attachment)}
                className="btn btn-primary h-11 w-11 p-0 rounded-2xl flex items-center justify-center shrink-0 shadow-lg disabled:opacity-40 bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
