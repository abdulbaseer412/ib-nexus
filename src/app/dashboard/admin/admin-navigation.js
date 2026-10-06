import {
  ShieldAlert, Users, MessageSquare, Radio, History,
  Cpu, Sparkles, BookOpen, Lock, Globe, MessageCircle, Mail, FileText, BellRing
} from "lucide-react";

/**
 * Authoritative source of truth for the Admin Control Center navigation hierarchy.
 * Conceptually structured into 5 core domain groups + Overview.
 */
export const ADMIN_INFORMATION_ARCHITECTURE = [
  {
    id: "overview_group",
    label: "Overview & Requests",
    icon: ShieldAlert,
    sections: [
      { id: "overview", label: "Overview", icon: ShieldAlert },
      { id: "admin_requests", label: "Central Requests Hub", icon: BellRing }
    ]
  },
  {
    id: "ai_group",
    label: "AI & Intelligence",
    icon: Sparkles,
    sections: [
      { id: "models", label: "AI Models", icon: Cpu },
      { id: "feedback", label: "AI Feedback", icon: MessageCircle, defaultSubTab: "negative" },
      { id: "aicore", label: "Nexus AI Core", icon: Sparkles }
    ]
  },
  {
    id: "users_access_group",
    label: "Users & Access",
    icon: Users,
    sections: [
      { id: "users", label: "Users", icon: Users },
      { id: "contact_inbox", label: "Contact Inbox", icon: Mail },
      { id: "website", label: "Website Access", icon: Lock }
    ]
  },
  {
    id: "academics_group",
    label: "Content & Academics",
    icon: BookOpen,
    sections: [
      { id: "courses", label: "Course Catalog", icon: BookOpen },
      { id: "resources_moderation", label: "Resource Submissions", icon: FileText }
    ]
  },
  {
    id: "community_live_group",
    label: "Community & Live",
    icon: MessageSquare,
    sections: [
      { id: "community", label: "Community Moderation", icon: MessageSquare },
      { id: "rooms", label: "Live Rooms", icon: Radio }
    ]
  },
  {
    id: "system_audit_group",
    label: "System & Audit",
    icon: History,
    sections: [
      { id: "logs", label: "Activity Audit Log", icon: History }
    ]
  }
];

export function findGroupForSection(sectionId) {
  for (const group of ADMIN_INFORMATION_ARCHITECTURE) {
    if (group.sections.some(s => s.id === sectionId)) {
      return group;
    }
  }
  return ADMIN_INFORMATION_ARCHITECTURE[0]; // fallback to overview
}

export function getAllSections() {
  const sections = [];
  for (const group of ADMIN_INFORMATION_ARCHITECTURE) {
    sections.push(...group.sections);
  }
  return sections;
}
