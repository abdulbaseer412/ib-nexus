import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  const supabase = createAdminClient();
  
  // Delete all posts (cascades to replies, reactions, bookmarks, etc)
  const { error: postError } = await supabase.from("community_posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  
  if (postError) {
    return Response.json({ error: postError.message });
  }

  // Delete all existing rooms
  const { error: deleteRoomsError } = await supabase.from("community_rooms").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteRoomsError) {
    return Response.json({ error: deleteRoomsError.message });
  }

  // Seed new beautiful HL/SL structured rooms
  const newRooms = [
    { subject: 'Biology', name: 'Biology HL', slug: 'biology-hl', description: 'Higher Level Biology discussion', sort_order: 1 },
    { subject: 'Biology', name: 'Biology SL', slug: 'biology-sl', description: 'Standard Level Biology discussion', sort_order: 2 },
    { subject: 'Biology', name: 'Biology IA & EE', slug: 'biology-ia-ee', description: 'Coursework help for Biology', sort_order: 3 },
    { subject: 'Chemistry', name: 'Chemistry HL', slug: 'chemistry-hl', description: 'Higher Level Chemistry discussion', sort_order: 4 },
    { subject: 'Chemistry', name: 'Chemistry SL', slug: 'chemistry-sl', description: 'Standard Level Chemistry discussion', sort_order: 5 },
    { subject: 'Chemistry', name: 'Chemistry IA & EE', slug: 'chemistry-ia-ee', description: 'Coursework help for Chemistry', sort_order: 6 },
    { subject: 'Physics', name: 'Physics HL', slug: 'physics-hl', description: 'Higher Level Physics discussion', sort_order: 7 },
    { subject: 'Physics', name: 'Physics SL', slug: 'physics-sl', description: 'Standard Level Physics discussion', sort_order: 8 },
    { subject: 'Physics', name: 'Physics IA & EE', slug: 'physics-ia-ee', description: 'Coursework help for Physics', sort_order: 9 },
    { subject: 'Mathematics', name: 'Math AA HL', slug: 'math-aa-hl', description: 'Analysis and Approaches HL', sort_order: 10 },
    { subject: 'Mathematics', name: 'Math AA SL', slug: 'math-aa-sl', description: 'Analysis and Approaches SL', sort_order: 11 },
    { subject: 'Mathematics', name: 'Math AI HL', slug: 'math-ai-hl', description: 'Applications and Interpretation HL', sort_order: 12 },
    { subject: 'Mathematics', name: 'Math AI SL', slug: 'math-ai-sl', description: 'Applications and Interpretation SL', sort_order: 13 },
    { subject: 'Computer Science', name: 'Comp Sci HL', slug: 'cs-hl', description: 'Higher Level Computer Science', sort_order: 14 },
    { subject: 'Computer Science', name: 'Comp Sci SL', slug: 'cs-sl', description: 'Standard Level Computer Science', sort_order: 15 },
    { subject: 'Economics', name: 'Economics HL', slug: 'economics-hl', description: 'Higher Level Economics', sort_order: 16 },
    { subject: 'Economics', name: 'Economics SL', slug: 'economics-sl', description: 'Standard Level Economics', sort_order: 17 },
    { subject: 'History', name: 'History HL', slug: 'history-hl', description: 'Higher Level History', sort_order: 18 },
    { subject: 'History', name: 'History SL', slug: 'history-sl', description: 'Standard Level History', sort_order: 19 },
    { subject: 'Geography', name: 'Geography HL', slug: 'geography-hl', description: 'Higher Level Geography', sort_order: 20 },
    { subject: 'Geography', name: 'Geography SL', slug: 'geography-sl', description: 'Standard Level Geography', sort_order: 21 },
    { subject: 'English', name: 'English Lit HL', slug: 'english-lit-hl', description: 'English Literature HL', sort_order: 22 },
    { subject: 'English', name: 'English Lit SL', slug: 'english-lit-sl', description: 'English Literature SL', sort_order: 23 },
    { subject: 'English', name: 'English Lang & Lit', slug: 'english-lang-lit', description: 'English Language & Literature', sort_order: 24 },
    { subject: 'Languages', name: 'Language B HL', slug: 'lang-b-hl', description: 'Language Acquisition HL', sort_order: 25 },
    { subject: 'Languages', name: 'Language B SL', slug: 'lang-b-sl', description: 'Language Acquisition SL', sort_order: 26 },
    { subject: 'Business Management', name: 'Business HL', slug: 'business-hl', description: 'Higher Level Business Management', sort_order: 27 },
    { subject: 'Business Management', name: 'Business SL', slug: 'business-sl', description: 'Standard Level Business Management', sort_order: 28 },
    { subject: 'TOK', name: 'TOK Exhibition', slug: 'tok-exhibition', description: 'Theory of Knowledge Exhibition', sort_order: 29 },
    { subject: 'TOK', name: 'TOK Essay', slug: 'tok-essay', description: 'Theory of Knowledge Essay', sort_order: 30 },
    { subject: 'Extended Essay', name: 'EE General Support', slug: 'ee-general', description: 'Extended Essay general advice', sort_order: 31 },
    { subject: 'General IB', name: 'IB General Chat', slug: 'ib-general', description: 'General IB discussion', sort_order: 32 }
  ];

  const { error: seedError } = await supabase.from("community_rooms").insert(newRooms);

  if (seedError) {
    return Response.json({ error: seedError.message });
  }
  
  revalidatePath("/dashboard/community", "layout");
  return Response.json({ success: true, message: "Cleared all community content and re-seeded HL/SL rooms!" });
}
