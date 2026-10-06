"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search, BookOpen, Sliders, ShieldCheck, HelpCircle,
  Wrench, Lightbulb, CheckCircle2, ArrowRight, ChevronDown,
  ChevronUp, X, ExternalLink, MessageSquare, Send, ThumbsUp,
  ThumbsDown, Copy, Check, Clock, LifeBuoy, Bug, FileText,
  Layers, Calendar, GraduationCap, AlertCircle, Sparkles,
  ArrowUpRight, Share2, Eye
} from "lucide-react";
import { submitUserSupportRequestAction } from "@/app/dashboard/admin/actions";

const CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting started",
    description: "Creating an account, choosing your 6 IB subjects, setting up syllabi, and study preferences.",
    icon: GraduationCap,
    color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    badge: "4 Guides",
    accent: "text-blue-400",
  },
  {
    id: "study-tools",
    title: "Using study tools",
    description: "Smart notes with LaTeX, spaced repetition flashcards, AI learning companion, and exam papers.",
    icon: BookOpen,
    color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    badge: "5 Guides",
    accent: "text-purple-400",
  },
  {
    id: "account-security",
    title: "Account questions",
    description: "Sign-in methods, Google OAuth connection, password resets, and session management.",
    icon: ShieldCheck,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    badge: "4 Guides",
    accent: "text-emerald-400",
  },
  {
    id: "technical-support",
    title: "Technical support",
    description: "Troubleshooting file uploads, cache sync, offline access, and reporting a software bug.",
    icon: Wrench,
    color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    badge: "3 Guides",
    accent: "text-amber-400",
  },
  {
    id: "feature-requests",
    title: "Feature requests",
    description: "Propose new features, review community roadmap updates, and vote on upcoming study tools.",
    icon: Lightbulb,
    color: "from-violet-500/20 to-indigo-500/20 text-violet-400 border-violet-500/30",
    badge: "3 Guides",
    accent: "text-violet-400",
  },
  {
    id: "privacy-security",
    title: "Privacy & security",
    description: "Understand data handling, GDPR compliance, safe study pledges, and academic integrity rules.",
    icon: Layers,
    color: "from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30",
    badge: "3 Guides",
    accent: "text-rose-400",
  },
];

const GUIDES = [
  // Getting Started
  {
    id: "gs-setup-subjects",
    category: "getting-started",
    title: "How to Set Up Your 6 IB Subjects (HL & SL)",
    readTime: "3 min read",
    summary: "Select your higher-level and standard-level courses, align with the 2025/2026 syllabus, and configure exam sessions.",
    content: [
      {
        type: "paragraph",
        text: "The IB Diploma requires candidates to take six academic subjects (typically 3 at Higher Level and 3 at Standard Level). Setting these up accurately on IB Nexus ensures that your dashboard, AI study assistant, and revision planner are calibrated precisely to your subject specifications."
      },
      {
        type: "steps",
        items: [
          "Navigate to your Study Hub dashboard and click on 'Subjects' in the left navigation sidebar or select 'Settings → Academic Profile'.",
          "Click the '+ Add Subject' button and choose your subject group (Studies in Language and Literature, Language Acquisition, Individuals and Societies, Sciences, Mathematics, or The Arts).",
          "Toggle between HL (Higher Level) and SL (Standard Level) to calibrate weighting and syllabus depth.",
          "Select your target examination session (e.g., May 2026 or November 2026) and set your target grade (1–7).",
          "Save changes. Your dashboard will immediately generate customized revision roadmaps and past-paper checklists for each enrolled course."
        ]
      },
      {
        type: "tip",
        text: "Tip: You can update your subjects or adjust levels anytime from Settings → Academic Profile without losing your notes or study progress."
      }
    ]
  },
  {
    id: "gs-exam-session-targets",
    category: "getting-started",
    title: "Calibrating Target Grades and Exam Sessions",
    readTime: "2 min read",
    summary: "Set grade benchmarks (1 to 7) to guide active revision pacing and progress tracking across all your classes.",
    content: [
      {
        type: "paragraph",
        text: "Setting clear, incremental targets helps maintain study momentum across the rigorous 2-year IB timeline. IB Nexus tracks your mock exam results, flashcard mastery, and internal assessment milestones against your personal grade expectations."
      },
      {
        type: "steps",
        items: [
          "Visit 'Settings' and open the 'Academic Profile' tab.",
          "For each course, select your current predicted grade alongside your target grade.",
          "Our system highlights syllabus gaps and prioritizes flashcard recall for subjects where your current grade is below your target grade.",
          "Review your 'Predicted vs Target' overview in the Study Hub analytics dashboard weekly."
        ]
      }
    ]
  },
  {
    id: "gs-study-hub-shortcuts",
    category: "getting-started",
    title: "Study Hub Navigation & Keyboard Shortcuts",
    readTime: "2 min read",
    summary: "Boost your study workflow with universal search, quick-switch keys, and instant note capture.",
    content: [
      {
        type: "paragraph",
        text: "Power through revision sessions without mouse friction using IB Nexus global shortcuts."
      },
      {
        type: "steps",
        items: [
          "Press Ctrl + K (or ⌘ + K on Mac) anywhere to open the Universal Search Bar.",
          "Type '/' while browsing to jump directly into subject search.",
          "Press Esc to dismiss any open modal, reader drawer, or notification panel.",
          "Use the top navigation bell icon to track moderator updates on submitted notes or questions in real time."
        ]
      }
    ]
  },
  {
    id: "gs-academic-profile",
    category: "getting-started",
    title: "Managing Academic Preferences & Exam Timeline",
    readTime: "3 min read",
    summary: "Keep your school context, examination zone (Timezone A/B/C), and deadline alerts up to date.",
    content: [
      {
        type: "paragraph",
        text: "Exam timezones dictate when papers are sat and ensure mock exam countdowns trigger accurately in your local timezone."
      },
      {
        type: "steps",
        items: [
          "Open your Profile settings and check that your local timezone matches your school's testing center.",
          "Add key deadlines for Internal Assessments (IAs), Extended Essay (EE) first drafts, and Theory of Knowledge (TOK) exhibitions.",
          "The IB Nexus Planner will automatically space out your study sessions to prevent deadline clustering."
        ]
      }
    ]
  },

  // Study Tools
  {
    id: "st-ai-study-assistant",
    category: "study-tools",
    title: "Mastering the AI Study Assistant for Syllabus Breakdowns",
    readTime: "4 min read",
    summary: "Ask curriculum-aligned questions, generate marking scheme rubrics, and unpack complex command terms.",
    content: [
      {
        type: "paragraph",
        text: "The IB Nexus AI Assistant is trained specifically on IB command terms ('Evaluate', 'Discuss', 'To what extent', 'Compare & Contrast') and syllabus boundaries to ensure you never waste time studying non-examinable content."
      },
      {
        type: "steps",
        items: [
          "Click 'AI Study Partner' in the dashboard navigation bar.",
          "Select the active subject context (e.g., Biology HL or History SL) so the assistant calibrates to that specific guide.",
          "Try asking: 'Break down the Paper 2 Section B mark scheme for Cell Respiration' or 'Outline an essay structure for Cold War origins.'",
          "Export answers directly into your personal Notes or generate a 5-card flashcard set with one click."
        ]
      },
      {
        type: "tip",
        text: "Important: The AI assistant is a study aid to clarify concepts. Always write your final coursework and IA drafts independently in accordance with IB Academic Honesty standards."
      }
    ]
  },
  {
    id: "st-flashcards-mastery",
    category: "study-tools",
    title: "Spaced Repetition Flashcards & Active Recall",
    readTime: "3 min read",
    summary: "Use SM-2 based spaced repetition algorithms to lock critical definitions, formulas, and case studies into long-term memory.",
    content: [
      {
        type: "paragraph",
        text: "Cramming fades within 48 hours. IB Nexus Flashcards use spaced intervals to prompt you for review right before your brain is about to forget the concept."
      },
      {
        type: "steps",
        items: [
          "Head to 'Flashcards' and select a deck or click '+ New Deck'.",
          "During review, test yourself before flipping the card. Rate your recall difficulty: 'Again' (1 day), 'Hard' (3 days), 'Good' (7 days), or 'Easy' (14 days).",
          "The algorithm automatically queues overdue cards into your daily study session.",
          "Review 15–20 minutes daily for maximum retention before mock examinations."
        ]
      }
    ]
  },
  {
    id: "st-notes-latex",
    category: "study-tools",
    title: "Creating Rich Notes with LaTeX Math & Syllabus Tags",
    readTime: "3 min read",
    summary: "Format math equations, chemical formulas, and syllabus sub-topics cleanly with instant preview.",
    content: [
      {
        type: "paragraph",
        text: "Mathematics AA/AI and Sciences require precise notation. The IB Nexus Note Editor includes full KaTeX mathematical equation support."
      },
      {
        type: "steps",
        items: [
          "Open 'Notes' and click '+ Create Note'.",
          "Use inline math syntax: $E = mc^2$ or block math: $$\\int_{0}^{\\pi} \\sin(x)dx$$.",
          "Attach syllabus codes (e.g., Topic 3.1, Option B) to group notes automatically under the relevant subject dashboard.",
          "Export notes as clean PDFs or share them with your study group."
        ]
      }
    ]
  },
  {
    id: "st-resources-library",
    category: "study-tools",
    title: "Accessing & Filtering Verified Community Resources",
    readTime: "3 min read",
    summary: "Download curated revision guides, past assessment formats, and student exemplars vetted by moderators.",
    content: [
      {
        type: "paragraph",
        text: "The Community Resources library features student-submitted, moderator-vetted study summaries, question banks, and revision checklists."
      },
      {
        type: "steps",
        items: [
          "Navigate to 'Resources' in the sidebar.",
          "Filter by Subject, Level (HL/SL), Resource Type (Past Paper, Revision Guide, Formula Sheet), and Year.",
          "Bookmark resources to your private library for instant offline access.",
          "To submit your own study guide, click 'Upload Resource'. All submissions enter the moderation queue to ensure academic rigor."
        ]
      }
    ]
  },
  {
    id: "st-study-planner",
    category: "study-tools",
    title: "Smart Study Planner & IA Deadline Management",
    readTime: "3 min read",
    summary: "Organize revision blocks, track IA drafts, and balance 6 subjects without burning out.",
    content: [
      {
        type: "paragraph",
        text: "The Planner aggregates your subject goals, upcoming school tests, and internal assessment deadlines into a unified study timeline."
      },
      {
        type: "steps",
        items: [
          "Click 'Planner' in the main navigation.",
          "Click '+ Add Task' to add a revision block, test date, or IA draft submission.",
          "Assign a priority level (High, Medium, Normal) and estimated study duration.",
          "The system will highlight potential study conflicts and recommend optimal revision slots."
        ]
      }
    ]
  },

  // Account & Security
  {
    id: "as-manage-signin-methods",
    category: "account-security",
    title: "Managing Sign-in Methods: Google & Password",
    readTime: "2 min read",
    summary: "Enable or disable Email & Password and Google sign-in methods securely from Settings.",
    content: [
      {
        type: "paragraph",
        text: "IB Nexus allows you to sign in with your Google account or via Email & Password. To prevent account lockout, at least one secure sign-in method must always remain active."
      },
      {
        type: "steps",
        items: [
          "Sign in to your account and navigate to 'Settings → Security'.",
          "Under 'Sign-in methods', you can see your currently enabled methods.",
          "To connect Google, click 'Connect Google' and complete the Google OAuth confirmation.",
          "To disable a method, click 'Disable'. The system will ensure you have a second verified method active before confirming.",
          "If a method is disabled, attempts to sign in via that method will be blocked with a clear redirect to your enabled method."
        ]
      }
    ]
  },
  {
    id: "as-password-reset",
    category: "account-security",
    title: "Resetting Your Password or Account Recovery",
    readTime: "2 min read",
    summary: "How to regain account access if you forgot your password or your sign-in details changed.",
    content: [
      {
        type: "paragraph",
        text: "If you lose access to your password, you can trigger a secure recovery link to your registered email address."
      },
      {
        type: "steps",
        items: [
          "Go to the Sign In page and click 'Forgot password?'.",
          "Enter your registered account email and click 'Send Reset Instructions'.",
          "Check your inbox (and spam folder) for an email from IB Nexus containing a secure one-time password reset link.",
          "Click the link, enter your new strong password (at least 8 characters with a number or symbol), and confirm."
        ]
      }
    ]
  },
  {
    id: "as-device-sessions",
    category: "account-security",
    title: "Managing Active Devices & Signing Out",
    readTime: "2 min read",
    summary: "Ensure account security when using shared school computers or public library terminals.",
    content: [
      {
        type: "paragraph",
        text: "When studying on school laptops or public computers, always sign out properly to prevent unauthorized access to your notes."
      },
      {
        type: "steps",
        items: [
          "Click your user avatar in the top right navbar to open the user menu.",
          "Click 'Sign Out' to immediately terminate your session and clear local auth tokens.",
          "If you left a device logged in elsewhere, visit 'Settings → Security' to terminate all active sessions."
        ]
      }
    ]
  },
  {
    id: "as-updating-profile-details",
    category: "account-security",
    title: "Updating Display Name, Avatar, and Email",
    readTime: "2 min read",
    summary: "Change your community display name, upload a custom study avatar, and manage notification alerts.",
    content: [
      {
        type: "paragraph",
        text: "Your display name represents you in study groups and community discussions."
      },
      {
        type: "steps",
        items: [
          "Go to 'Settings → Profile'.",
          "Update your Full Name, Display Name, and bio.",
          "Choose an avatar or upload a custom profile picture.",
          "Save your changes. Your profile updates will reflect instantly across community rooms and notes."
        ]
      }
    ]
  },

  // Technical Support
  {
    id: "ts-troubleshooting-cache",
    category: "technical-support",
    title: "Troubleshooting Slow Loads, Cache Sync & Page Errors",
    readTime: "2 min read",
    summary: "Quick fixes for browser cache conflicts, offline sync hiccups, or stale session state.",
    content: [
      {
        type: "paragraph",
        text: "Because IB Nexus uses progressive caching for fast navigation, stale browser service workers can occasionally cause rendering conflicts."
      },
      {
        type: "steps",
        items: [
          "Perform a hard refresh: Press Ctrl + F5 (or ⌘ + Shift + R on Mac).",
          "If a page appears blank, open your browser Settings and clear Cached Images and Files.",
          "Ensure cookies are enabled for 'localhost' or 'ibnexus.com'.",
          "Check the system status indicator at the top of the Help Center to verify API uptime."
        ]
      }
    ]
  },
  {
    id: "ts-upload-limits",
    category: "technical-support",
    title: "File Upload Guidelines & PDF Formatting Limits",
    readTime: "2 min read",
    summary: "File size limits, allowed extensions (PDF, DOCX, PNG), and scanning recommendations.",
    content: [
      {
        type: "paragraph",
        text: "To ensure fast downloads for all students, uploaded notes and past papers must comply with standard size constraints."
      },
      {
        type: "steps",
        items: [
          "Maximum file size for resource uploads is 25MB per document.",
          "Supported formats: PDF (.pdf), Microsoft Word (.docx), and high-resolution images (.png, .jpg).",
          "Ensure handwritten notes are clearly scanned with a document scanner app (e.g. Adobe Scan) in black & white or high contrast.",
          "Avoid uploading password-protected or encrypted PDFs."
        ]
      }
    ]
  },
  {
    id: "ts-report-bug-guide",
    category: "technical-support",
    title: "How to Report a Technical Bug or UI Glitch",
    readTime: "2 min read",
    summary: "Submit bug details straight to our engineering team with device info for rapid resolution.",
    isActionGuide: true,
    actionType: "bug",
    content: [
      {
        type: "paragraph",
        text: "Found a broken button, unexpected redirect, or styling glitch? Let us know directly so our engineers can fix it immediately."
      },
      {
        type: "steps",
        items: [
          "Click the 'Report a Bug' button below or use the quick feedback modal in the Help Center.",
          "Describe what you were doing when the issue occurred (e.g., 'Clicked login while disabled email was active').",
          "Mention your browser (Chrome, Safari, Edge) and operating system (Windows, Mac, iOS).",
          "Our moderation and engineering teams review reports daily and log progress in your Notification Center."
        ]
      }
    ]
  },

  // Feature Requests
  {
    id: "fr-how-requests-work",
    category: "feature-requests",
    title: "How Community-Driven Development Works at IB Nexus",
    readTime: "2 min read",
    summary: "Learn how student suggestions are reviewed, prioritized, and built into upcoming platform releases.",
    content: [
      {
        type: "paragraph",
        text: "IB Nexus is shaped directly by students undergoing the IB Diploma. We prioritize features that reduce friction, improve active recall, and make managing coursework easier."
      },
      {
        type: "steps",
        items: [
          "Submit a feature idea with clear context on how it helps IB revision.",
          "Our core team reviews submissions weekly and groups related requests.",
          "High-priority features enter our public roadmap with estimated release targets.",
          "You will receive moderator status updates directly in your notification center when your proposal is reviewed."
        ]
      }
    ]
  },
  {
    id: "fr-upcoming-roadmap",
    category: "feature-requests",
    title: "Current Platform Roadmap & What We're Building Next",
    readTime: "3 min read",
    summary: "Explore upcoming features: Collaborative Study Rooms, CAS Activity Logger, and Mobile App.",
    content: [
      {
        type: "paragraph",
        text: "Here is what our development team is actively engineering for upcoming releases:"
      },
      {
        type: "steps",
        items: [
          "Live Collaborative Study Rooms: Pomodoro-synced revision rooms with real-time subject chat.",
          "CAS Activity & Reflection Tracker: Log Creativity, Activity, and Service hours directly linked to IB learning outcomes.",
          "Native Mobile PWA App: Offline flashcard reviews on iOS and Android with push notifications for study streaks.",
          "Extended Essay (EE) Timeline Assistant: Step-by-step checkpoints from research question to final bibliography."
        ]
      }
    ]
  },
  {
    id: "fr-submit-feature-guide",
    category: "feature-requests",
    title: "Submit a Feature Idea or Tool Suggestion",
    readTime: "2 min read",
    summary: "Have an idea for a new study tool? Submit it directly into the development queue.",
    isActionGuide: true,
    actionType: "feature",
    content: [
      {
        type: "paragraph",
        text: "We welcome all suggestions from IB scholars, teachers, and coordinators worldwide."
      },
      {
        type: "steps",
        items: [
          "Click the 'Submit Feature Idea' button below to open the submission form.",
          "Provide a clear title (e.g., 'Formula Sheet quick-look panel inside Math Notes').",
          "Explain why this tool will help you and other IB candidates during revision.",
          "Track your submission status in the top notification bar ('My Requests & Moderator Updates')."
        ]
      }
    ]
  },

  // Privacy & Integrity
  {
    id: "pi-academic-integrity",
    category: "privacy-security",
    title: "Academic Honesty: Sharing Notes vs Copyrighted Content",
    readTime: "3 min read",
    summary: "Understand IB academic integrity policies regarding sharing original notes, citations, and assessment ethics.",
    content: [
      {
        type: "paragraph",
        text: "IB Nexus strictly enforces the International Baccalaureate Academic Honesty and Intellectual Property policies."
      },
      {
        type: "steps",
        items: [
          "Original Summaries: You are fully encouraged to share your original handwritten or typed revision summaries, flashcards, and study methods.",
          "Internal Assessments: Do NOT upload active unsubmitted IA, EE, or TOK drafts to public rooms to protect your authorship and prevent plagiarism flags.",
          "Copyright: Do not redistribute copyrighted commercial textbooks without explicit license.",
          "All resources are reviewed by platform moderators prior to public indexing."
        ]
      }
    ]
  },
  {
    id: "pi-data-protection",
    category: "privacy-security",
    title: "How Your Notes, Uploads & Personal Data Are Protected",
    readTime: "2 min read",
    summary: "Enterprise-grade encryption, private database isolation, and sovereign student ownership.",
    content: [
      {
        type: "paragraph",
        text: "Your study data belongs to you. Private notes, personal flashcards, and calendar events are protected by Row Level Security (RLS) in PostgreSQL."
      },
      {
        type: "steps",
        items: [
          "All data in transit is encrypted using TLS 1.3.",
          "Private notes and unfinished drafts are accessible only by your authenticated user session.",
          "We never sell student data to third-party ad networks or marketing agencies.",
          "You can request a full archive export of all your notes and study assets anytime."
        ]
      }
    ]
  },
  {
    id: "pi-gdpr-account-deletion",
    category: "privacy-security",
    title: "GDPR Rights, Data Export & Complete Account Deletion",
    readTime: "2 min read",
    summary: "Exercise your right to data portability or request permanent deletion of your profile.",
    content: [
      {
        type: "paragraph",
        text: "You retain full control over your digital footprint on IB Nexus."
      },
      {
        type: "steps",
        items: [
          "To export your study notes and progress, visit 'Settings → Privacy'.",
          "To request full deletion of your account and associated records, submit a deletion inquiry via the contact form.",
          "Account deletion cascades through all profile data, notes, and study sessions within 30 days in full compliance with GDPR."
        ]
      }
    ]
  },
];

const FAQS = [
  {
    q: "Who is IB Nexus designed for?",
    a: "IB Nexus is built specifically for International Baccalaureate (IB) Diploma Programme (DP) and Middle Years Programme (MYP) students who need a unified, calm space to organize notes, flashcards, revision planning, and study resources across their 6 academic subjects."
  },
  {
    q: "Does IB Nexus replace my classroom teacher or school syllabus?",
    a: "No. IB Nexus is designed as an independent academic study companion to support your independent study, timed practice, and active revision alongside your school's instruction and the official IB curriculum guide."
  },
  {
    q: "How does the notification bar ('My Requests & Moderator Updates') work?",
    a: "The notification bell in your top navigation tracks all your interactions in real time: when your submitted study materials are approved or need revision, moderator feedback, bug report replies, and community updates. You can filter by Pending, Approved, or Needs Revision."
  },
  {
    q: "What should I do if my sign-in method is disabled?",
    a: "If you disabled Email & Password in your Security settings, simply click 'Sign in with Google' on the login screen. You can always re-enable or adjust your sign-in methods anytime under Settings → Security."
  },
  {
    q: "Are community past papers and notes free to download?",
    a: "Yes. All verified community study resources, topic summaries, and revision guides uploaded by student scholars are completely free to read, download, and bookmark."
  },
  {
    q: "Can I use IB Nexus offline during revision?",
    a: "Yes. IB Nexus utilizes intelligent browser caching so you can view your previously loaded study notes and flashcard decks even with spotty Wi-Fi connections."
  },
  {
    q: "How can I suggest a new feature or report an issue?",
    a: "You can click 'Submit Feature Request' or 'Report a Bug' right here in the Help Center. All submissions generate an instant tracking ticket in your notification center."
  },
  {
    q: "How do I format math and science equations in my notes?",
    a: "Our note editor natively supports KaTeX. Simply wrap your equation in single dollar signs ($E = mc^2$) for inline math, or double dollar signs ($$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$) for centered equation blocks."
  },
];

export default function HelpCenterClient({ initialUser = null }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeGuide, setActiveGuide] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Modals state
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalSuccess, setModalSuccess] = useState("");
  const [modalError, setModalError] = useState("");

  // Form states for modals
  const [reqTitle, setReqTitle] = useState("");
  const [reqDetails, setReqDetails] = useState("");
  const [reqCategory, setReqCategory] = useState("Study Tools");

  const searchInputRef = useRef(null);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setActiveGuide(null);
        setFeatureModalOpen(false);
        setBugModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered guides based on search query and category
  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return GUIDES.filter((guide) => {
      const matchesCategory = selectedCategory === "all" || guide.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;

      const titleMatch = guide.title.toLowerCase().includes(q);
      const summaryMatch = guide.summary.toLowerCase().includes(q);
      const contentMatch = guide.content.some((c) =>
        (c.text && c.text.toLowerCase().includes(q)) ||
        (c.items && c.items.some((item) => item.toLowerCase().includes(q)))
      );
      return titleMatch || summaryMatch || contentMatch;
    });
  }, [searchQuery, selectedCategory]);

  const handleFeedback = (guideId, type) => {
    setFeedbackGiven((prev) => ({ ...prev, [guideId]: type }));
  };

  const handleCopyLink = (guideId) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/help#${guideId}`).catch(() => {});
      setCopiedId(guideId);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleModalSubmit = async (type) => {
    if (!reqTitle.trim()) {
      setModalError("Please provide a title for your submission.");
      return;
    }
    setModalSubmitting(true);
    setModalError("");
    setModalSuccess("");

    try {
      const res = await submitUserSupportRequestAction({
        type: type === "bug" ? "user_report" : "contact_inbox",
        title: `${type === "bug" ? "Bug Report: " : "Feature Suggestion: "}${reqTitle.trim()}`,
        details: reqDetails.trim() || "No additional details provided.",
        metadata: {
          category: reqCategory,
          type,
          submitted_at: new Date().toISOString(),
        }
      });

      if (res?.success) {
        setModalSuccess(
          type === "bug"
            ? "Your bug report has been logged and forwarded to our engineering team! You can track status in your top notification bar."
            : "Your feature suggestion was received! Our moderation team will review it and notify you via your top notification bar."
        );
        setReqTitle("");
        setReqDetails("");
        setTimeout(() => {
          setModalSuccess("");
          setFeatureModalOpen(false);
          setBugModalOpen(false);
        }, 3200);
      } else {
        setModalError(res?.error || "Failed to submit. Please check your connection.");
      }
    } catch (err) {
      setModalError(err.message || "An unexpected error occurred.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const activeCategoryObj = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent)] selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[var(--accent)]/15 via-purple-600/5 to-transparent rounded-full blur-3xl opacity-70 dark:opacity-40" />
      </div>

      {/* Main Container with generous top padding for fixed navbar */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[96px] sm:pt-[110px] pb-16 space-y-12">
        {/* Top Header & Breadcrumbs */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--muted)] shadow-sm">
            <Link href="/" className="hover:text-[var(--foreground)] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[var(--accent)]">Help Centre</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--foreground)] bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--muted)] bg-clip-text">
            How can we help?
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed max-w-2xl mx-auto">
            Find step-by-step guidance for organizing your IB subjects, using study tools, managing your account, and tracking moderator feedback.
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-2 relative max-w-2xl mx-auto">
            <div className="relative flex items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg shadow-black/5 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-all group">
              <div className="pl-4 pr-2 text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors">
                <Search size={20} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help topics, guides, LaTeX math, past papers, security..."
                aria-label="Search help topics"
                className="w-full bg-transparent py-3.5 pr-20 text-sm sm:text-base text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="pr-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              ) : (
                <div className="pr-4 hidden sm:flex items-center gap-1 text-[11px] font-mono text-[var(--muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                  <span>Ctrl</span>
                  <span>+</span>
                  <span>K</span>
                </div>
              )}
            </div>

            {/* Quick action chips below search */}
            <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
              <button
                type="button"
                onClick={() => { setReqCategory("Technical Support"); setBugModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-all"
              >
                <Bug size={13} className="text-amber-400" />
                <span>Report a Bug</span>
              </button>
              <button
                type="button"
                onClick={() => { setReqCategory("Study Tools"); setFeatureModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-all"
              >
                <Lightbulb size={13} className="text-violet-400" />
                <span>Submit Feature Request</span>
              </button>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-all"
              >
                <LifeBuoy size={13} className="text-sky-400" />
                <span>Contact Academic Team</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 6 Interactive Category Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
              Browse by topic
            </h2>
            {selectedCategory !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>Reset to all topics</span>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
                  className={`text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 relative group flex flex-col justify-between ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--surface-alt)] shadow-lg shadow-[var(--accent)]/10 ring-2 ring-[var(--accent)]/20"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-alt)]/60 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center bg-gradient-to-br ${cat.color} shadow-sm group-hover:scale-105 transition-transform`}>
                        <IconComp size={20} />
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        isSelected
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--border)]"
                      }`}>
                        {cat.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className={`text-base font-bold transition-colors ${isSelected ? "text-[var(--accent)]" : "text-[var(--foreground)] group-hover:text-[var(--foreground)]"}`}>
                        {cat.title}
                      </h3>
                      <p className="text-xs text-[var(--muted)] leading-relaxed mt-1">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-semibold text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                    <span>{isSelected ? "Showing articles below" : "Explore topic"}</span>
                    <ArrowRight size={14} className={`transition-transform ${isSelected ? "rotate-90 text-[var(--accent)]" : "group-hover:translate-x-1"}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Category Filter Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All Guides ({GUIDES.length})
          </button>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        {/* Search & Guides List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <span>{activeCategoryObj ? activeCategoryObj.title : "Recommended Guides"}</span>
              <span className="text-xs font-normal text-[var(--muted)]">
                ({filteredGuides.length} {filteredGuides.length === 1 ? "article" : "articles"})
              </span>
            </h2>

            {searchQuery && (
              <span className="text-xs text-[var(--muted)]">
                Filtering by: &ldquo;<strong className="text-[var(--foreground)]">{searchQuery}</strong>&rdquo;
              </span>
            )}
          </div>

          {filteredGuides.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--muted)]">
                <HelpCircle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--foreground)]">No guides found</h3>
                <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                  We couldn&apos;t find an article matching &ldquo;{searchQuery}&rdquo;. Would you like to ask our academic team or submit a suggestion?
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]"
                >
                  Clear search
                </button>
                <Link
                  href="/contact"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 shadow-sm"
                >
                  Ask our team
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredGuides.map((guide) => {
                const categoryObj = CATEGORIES.find((c) => c.id === guide.category);
                const IconComp = categoryObj?.icon || FileText;

                return (
                  <div
                    key={guide.id}
                    id={guide.id}
                    className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-md transition-all flex flex-col justify-between group space-y-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--muted)]">
                          <IconComp size={11} className={categoryObj?.accent} />
                          <span>{categoryObj?.title}</span>
                        </span>
                        <span className="text-[11px] text-[var(--muted)] font-mono flex items-center gap-1">
                          <Clock size={11} />
                          <span>{guide.readTime}</span>
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">
                        {guide.summary}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => setActiveGuide(guide)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline"
                      >
                        <Eye size={13} />
                        <span>Read Full Guide</span>
                      </button>

                      {guide.isActionGuide && (
                        <button
                          type="button"
                          onClick={() => {
                            if (guide.actionType === "bug") {
                              setReqCategory("Technical Support");
                              setBugModalOpen(true);
                            } else {
                              setReqCategory("Study Tools");
                              setFeatureModalOpen(true);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)] hover:text-white transition-colors"
                        >
                          {guide.actionType === "bug" ? "Open Bug Reporter" : "Submit Suggestion"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Frequently Asked Questions Section */}
        <div className="pt-8 border-t border-[var(--border)] space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)]">
              Quick answers to common questions about study routines, notification updates, and academic integrity.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="p-1 rounded-lg bg-[var(--surface-alt)] text-[var(--muted)] shrink-0">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] animate-in fade-in duration-200">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Still Need Assistance Banner */}
        <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface-alt)] to-[var(--surface)] p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto shadow-sm">
            <Sparkles size={22} />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-[var(--foreground)]">
              Can&apos;t find what you&apos;re looking for?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              Our academic guidance team and moderators are here to assist with syllabus queries, bug resolutions, and study tips.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <Link
              href="/contact"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 shadow-md transition-all"
            >
              Contact Support
            </Link>
            <button
              type="button"
              onClick={() => { setReqCategory("Community"); setFeatureModalOpen(true); }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)] transition-all"
            >
              Suggest an Improvement
            </button>
          </div>
        </div>
      </div>

      {/* Guide Reader Modal / Drawer */}
      {activeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                  {CATEGORIES.find((c) => c.id === activeGuide.category)?.title} • {activeGuide.readTime}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">
                  {activeGuide.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveGuide(null)}
                className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors"
                aria-label="Close guide"
              >
                <X size={20} />
              </button>
            </div>

            {/* Guide Body */}
            <div className="space-y-4 text-xs sm:text-sm text-[var(--foreground)] leading-relaxed">
              {activeGuide.content.map((block, i) => {
                if (block.type === "paragraph") {
                  return <p key={i} className="text-[var(--muted)] leading-relaxed">{block.text}</p>;
                }
                if (block.type === "steps") {
                  return (
                    <ol key={i} className="space-y-2.5 pl-2">
                      {block.items.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-[var(--accent)]/20">
                            {sIdx + 1}
                          </span>
                          <span className="text-[var(--foreground)]/90 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  );
                }
                if (block.type === "tip") {
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        <span>Helpful Tip</span>
                      </p>
                      <p className="text-amber-200/90 leading-relaxed pl-5">{block.text}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Was this helpful feedback bar */}
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">Was this guide helpful?</span>
                {feedbackGiven[activeGuide.id] ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check size={13} />
                    <span>Thank you for your feedback!</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleFeedback(activeGuide.id, "yes")}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] text-xs font-semibold flex items-center gap-1 hover:bg-[var(--surface-alt)]"
                    >
                      <ThumbsUp size={12} />
                      <span>Yes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(activeGuide.id, "no")}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border)] hover:border-rose-500 text-xs font-semibold flex items-center gap-1 hover:bg-[var(--surface-alt)]"
                    >
                      <ThumbsDown size={12} />
                      <span>No</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(activeGuide.id)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {copiedId === activeGuide.id ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={13} />
                      <span>Share Guide</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuide(null)}
                  className="px-4 py-1.5 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-xs font-bold hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Request Modal */}
      {featureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                  <Lightbulb size={16} />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Propose a Feature Idea</h3>
              </div>
              <button
                type="button"
                onClick={() => setFeatureModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1.5"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Share your suggestion for improving IB Nexus. Your ticket will appear in your notification bar under &ldquo;My Requests & Moderator Updates&rdquo;.
            </p>

            {modalSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <p className="leading-relaxed">{modalSuccess}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {modalError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Feature Title</label>
                  <input
                    type="text"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Formula Sheet Quick-Drawer in Math AA Notes"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-xs sm:text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Tool Category</label>
                  <select
                    value={reqCategory}
                    onChange={(e) => setReqCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-xs sm:text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Study Tools">Study Tools & Notes</option>
                    <option value="Flashcards">Flashcards & Memory</option>
                    <option value="AI Assistant">AI Assistant</option>
                    <option value="Planner">Study Planner & Deadlines</option>
                    <option value="Community">Community & Rooms</option>
                    <option value="Mobile App">Mobile & Offline</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">How should it work?</label>
                  <textarea
                    rows={4}
                    value={reqDetails}
                    onChange={(e) => setReqDetails(e.target.value)}
                    placeholder="Describe how this feature will help your revision and what it should look like..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-xs sm:text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setFeatureModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={modalSubmitting}
                    onClick={() => handleModalSubmit("feature")}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {modalSubmitting ? "Submitting..." : "Submit Proposal"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      {bugModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Bug size={16} />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Report a Technical Bug</h3>
              </div>
              <button
                type="button"
                onClick={() => setBugModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1.5"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Found a bug or glitch? Let our engineers know. We resolve high-impact issues promptly and log updates in your notification center.
            </p>

            {modalSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <p className="leading-relaxed">{modalSuccess}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {modalError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Issue Summary</label>
                  <input
                    type="text"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Note PDF export cut off formulas on page 2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-xs sm:text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Affected Area</label>
                  <select
                    value={reqCategory}
                    onChange={(e) => setReqCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-xs sm:text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Notes">Notes & Equations</option>
                    <option value="Flashcards">Flashcards</option>
                    <option value="AI Assistant">AI Assistant</option>
                    <option value="Authentication">Sign In & Security</option>
                    <option value="Resources">Resource Uploads</option>
                    <option value="Other">Other UI / Visual Glitch</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Steps to Reproduce</label>
                  <textarea
                    rows={4}
                    value={reqDetails}
                    onChange={(e) => setReqDetails(e.target.value)}
                    placeholder="What were the steps that caused the issue? Include your browser or device if possible..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-xs sm:text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setBugModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={modalSubmitting}
                    onClick={() => handleModalSubmit("bug")}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
                  >
                    {modalSubmitting ? "Logging..." : "Log Bug Ticket"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
