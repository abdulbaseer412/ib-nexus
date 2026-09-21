import { createServerClient } from "@/lib/supabase/server";

/**
 * Server-side data fetcher for the post-login Welcome Dashboard.
 * Efficiently queries real user content (Notes, Resources, Flashcards, AI Chats, Tasks)
 * in parallel and determines smart continuation targets.
 */
export async function fetchUserDashboardData(userId) {
  if (!userId) return null;

  try {
    const supabase = await createServerClient();

    const [
      notesRes,
      resourcesRes,
      decksRes,
      chatsRes,
      tasksRes,
      notesCountRes,
      resourcesCountRes,
      decksCountRes,
    ] = await Promise.all([
      // Recent Notes
      supabase
        .from("ib_notes")
        .select("id, title, subject, updated_at, last_opened_at, topic")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(3),

      // Recent Resources
      supabase
        .from("ib_resources")
        .select("id, title, subject, file_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),

      // Recent Decks
      supabase
        .from("ib_flashcard_decks")
        .select("id, title, subject, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),

      // Recent AI Conversations
      supabase
        .from("ai_conversations")
        .select("id, title, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(3),

      // Recent Planner Tasks
      supabase
        .from("planner_tasks")
        .select("id, title, completed, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(3),

      // Counts
      supabase.from("ib_notes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("ib_resources").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("ib_flashcard_decks").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const recentNotes = notesRes.data || [];
    const recentResources = resourcesRes.data || [];
    const recentDecks = decksRes.data || [];
    const recentChats = chatsRes.data || [];
    const recentTasks = tasksRes.data || [];

    const notesCount = notesCountRes.count || 0;
    const resourcesCount = resourcesCountRes.count || 0;
    const decksCount = decksCountRes.count || 0;

    // Determine smart continuation target (rule #34 & #12)
    let continueTarget = {
      label: "Open Nexus AI →",
      href: "/dashboard/ai",
      type: "ai",
      title: "Nexus AI",
    };

    if (recentChats.length > 0) {
      const topChat = recentChats[0];
      const chatTitle = topChat.title && topChat.title.trim() ? topChat.title.trim() : "Nexus AI Chat";
      continueTarget = {
        label: `Continue Chat: "${chatTitle}"`,
        href: `/dashboard/ai?conversationId=${topChat.id}`,
        type: "ai",
        title: chatTitle,
      };
    } else if (recentNotes.length > 0) {
      const topNote = recentNotes[0];
      const noteTitle = topNote.title && topNote.title.trim() ? topNote.title.trim() : "Untitled Note";
      continueTarget = {
        label: `Open Recent Note: "${noteTitle}"`,
        href: `/dashboard/notes/${topNote.id}`,
        type: "note",
        title: noteTitle,
      };
    }

    const hasAnyContent = notesCount > 0 || resourcesCount > 0 || decksCount > 0 || recentChats.length > 0;

    return {
      recentNotes,
      recentResources,
      recentDecks,
      recentChats,
      recentTasks,
      counts: {
        notes: notesCount,
        resources: resourcesCount,
        decks: decksCount,
        chats: recentChats.length,
      },
      continueTarget,
      hasAnyContent,
    };
  } catch (err) {
    console.error("[Dashboard Service] Error fetching dashboard data:", err);
    return {
      recentNotes: [],
      recentResources: [],
      recentDecks: [],
      recentChats: [],
      recentTasks: [],
      counts: { notes: 0, resources: 0, decks: 0, chats: 0 },
      continueTarget: {
        label: "Continue to Study Hub",
        href: "/dashboard",
        type: "dashboard",
        title: "Study Hub",
      },
      hasAnyContent: false,
    };
  }
}
