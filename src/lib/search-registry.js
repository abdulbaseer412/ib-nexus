import { 
  LayoutDashboard, BookOpen, BrainCircuit, CalendarDays, FolderOpen, 
  Users, MessageCircle, Settings, User, ShieldAlert, Sun, Moon, Plus,
  Target, LogOut, Search, Settings2, Sparkles, FolderPlus
} from "lucide-react";

export const STATIC_PAGES = [
  { id: "page-overview", title: "Overview", type: "page", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "dashboard", "main", "start"] },
  { id: "page-notes", title: "Notes", type: "page", href: "/dashboard/notes", icon: BookOpen, keywords: ["my notes", "folders", "topics", "knowledge"] },
  { id: "page-flashcards", title: "Flashcards", type: "page", href: "/dashboard/flashcards", icon: BrainCircuit, keywords: ["cards", "decks", "review", "practice", "memory"] },
  { id: "page-planner", title: "Study Planner", type: "page", href: "/dashboard/planner", icon: CalendarDays, keywords: ["schedule", "tasks", "deadlines", "goals", "my schedule", "what should i study"] },
  { id: "page-resources", title: "Resources", type: "page", href: "/dashboard/resources", icon: FolderOpen, keywords: ["past papers", "markschemes", "formula sheets", "library", "files"] },
  { id: "page-community", title: "Community", type: "page", href: "/dashboard/community", icon: Users, keywords: ["forum", "chat", "study groups", "discussions", "rooms"] },
  { id: "page-ai", title: "Nexus AI", type: "page", href: "/dashboard/ai", icon: MessageCircle, subtitle: "Get intelligent help", keywords: ["nexus", "ai", "help", "tutor", "chat", "explain"] },
  { id: "page-settings", title: "Settings", type: "page", href: "/settings", icon: Settings, keywords: ["preferences", "change settings", "options"] },
  { id: "page-profile", title: "Profile", type: "page", href: "/settings/profile", icon: User, keywords: ["my account", "change my name", "edit profile", "avatar", "school"] },
  { id: "page-security", title: "Security", type: "page", href: "/settings/security", icon: ShieldAlert, keywords: ["password", "change password", "change email", "auth"] },
];

export const STATIC_ACTIONS = [
  { id: "action-create-note", title: "Create a Note", type: "action", href: "/dashboard/notes?create=true", icon: Plus, keywords: ["new note", "write note"] },
  { id: "action-create-deck", title: "Create Flashcard Deck", type: "action", href: "/dashboard/flashcards?create=true", icon: Plus, keywords: ["new deck", "create deck", "new flashcards"] },
  { id: "action-add-task", title: "Add Planner Task", type: "action", href: "/dashboard/planner?action=task", icon: CalendarDays, keywords: ["new task", "add task", "to do"] },
  { id: "action-add-deadline", title: "Add Deadline", type: "action", href: "/dashboard/planner?action=deadline", icon: CalendarDays, keywords: ["new deadline", "add deadline"] },
  { id: "action-create-goal", title: "Create Goal", type: "action", href: "/dashboard/planner?action=goal", icon: Target, keywords: ["new goal", "add goal"] },
  { id: "action-plan-day", title: "Plan My Day", type: "action", href: "/dashboard/planner?action=plan-day", icon: Sparkles, keywords: ["build my day", "auto plan", "what to do"] },
  { id: "action-review-cards", title: "Smart Review", type: "action", href: "/dashboard/flashcards/review", icon: BrainCircuit, keywords: ["review cards", "practice flashcards", "study cards", "due cards"] },
  { id: "action-upload-resource", title: "Upload Resource", type: "action", href: "/dashboard/resources?upload=true", icon: FolderPlus, keywords: ["new resource", "add file", "upload document"] },
  { id: "action-dark-mode", title: "Toggle Dark Mode", type: "action", clientAction: "toggle-dark-mode", icon: Moon, keywords: ["dark mode", "appearance", "theme"] },
  { id: "action-light-mode", title: "Toggle Light Mode", type: "action", clientAction: "toggle-light-mode", icon: Sun, keywords: ["light mode", "appearance", "theme"] },
  { id: "action-sign-out", title: "Sign Out", type: "action", clientAction: "sign-out", icon: LogOut, keywords: ["logout", "log out", "leave"] },
];

export function performFuzzyMatch(query, item) {
  const q = query.toLowerCase();
  if (item.title.toLowerCase().includes(q)) return true;
  if (item.keywords && item.keywords.some(k => k.toLowerCase().includes(q))) return true;
  return false;
}
