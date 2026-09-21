import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // We use basic ilike queries here for demonstration.
    // In a production Postgres environment, FTS (to_tsvector) is preferred.
    const searchTerm = `%${query}%`;
    const results = [];

    // Run queries in parallel to drastically improve performance
    const [notesRes, decksRes, tasksRes, resourcesRes] = await Promise.all([
      // 1. Search Notes
      supabase
        .from("ib_notes")
        .select("id, title, subject")
        .eq("user_id", user.id)
        .ilike("title", searchTerm)
        .limit(5),
      
      // 2. Search Flashcard Decks
      supabase
        .from("ib_flashcard_decks")
        .select("id, title, subject")
        .eq("user_id", user.id)
        .ilike("title", searchTerm)
        .limit(5),

      // 3. Search Planner Tasks
      supabase
        .from("planner_tasks")
        .select("id, title")
        .eq("user_id", user.id)
        .ilike("title", searchTerm)
        .limit(5),

      // 4. Search Resources (Accessible to user)
      supabase
        .from("ib_resources")
        .select("id, title, type, subject")
        .ilike("title", searchTerm)
        .limit(5)
    ]);

    if (notesRes.data) {
      notesRes.data.forEach(n => results.push({
        id: `note-${n.id}`,
        title: n.title,
        subtitle: `Note • ${n.subject || 'General'}`,
        type: "content",
        href: `/dashboard/notes/${n.id}`,
        icon: "BookOpen"
      }));
    }

    if (decksRes.data) {
      decksRes.data.forEach(d => results.push({
        id: `deck-${d.id}`,
        title: d.title,
        subtitle: `Flashcard Deck • ${d.subject || 'General'}`,
        type: "content",
        href: `/dashboard/flashcards/deck/${d.id}`,
        icon: "BrainCircuit"
      }));
    }

    if (tasksRes.data) {
      tasksRes.data.forEach(t => results.push({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: "Planner Task",
        type: "content",
        href: `/dashboard/planner`, // Currently tasks are shown on planner page modal
        icon: "CalendarDays"
      }));
    }

    if (resourcesRes.data) {
      resourcesRes.data.forEach(r => results.push({
        id: `resource-${r.id}`,
        title: r.title,
        subtitle: `Resource • ${r.subject || 'General'}`,
        type: "content",
        href: `/dashboard/resources/${r.id}`,
        icon: "FolderOpen"
      }));
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
