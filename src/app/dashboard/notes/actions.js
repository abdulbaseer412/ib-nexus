"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getNotes() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ib_notes")
    .select("*")
    .order("last_opened_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
  return data;
}

export async function getNote(id) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ib_notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching note:", error);
    return null;
  }
  
  // Update last_opened_at
  await supabase
    .from("ib_notes")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", id);
    
  return data;
}

export async function createNote(formData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  const title = formData.get("title");
  const subject = formData.get("subject");
  const topic = formData.get("topic");
  const level = formData.get("level");
  const initialContent = formData.get("initial_content");
  const parentId = formData.get("parent_id");
  const examImportance = formData.get("exam_importance") || "Core Concept";

  if (!title || !subject) {
    throw new Error("Title and Subject are required");
  }

  const defaultContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }]
  };

  const { data, error } = await supabase
    .from("ib_notes")
    .insert({
      user_id: user.id,
      title,
      subject,
      topic,
      level,
      parent_id: parentId || null,
      exam_importance: examImportance,
      is_folder: false,
      content: initialContent || JSON.stringify(defaultContent)
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating note:", error);
    throw new Error("Failed to create note");
  }

  revalidatePath("/dashboard/notes");
  redirect(`/dashboard/notes/${data.id}`);
}

export async function createFolder(title, subject, parentId = null) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("ib_notes")
    .insert({
      user_id: user.id,
      title,
      subject,
      is_folder: true,
      parent_id: parentId || null,
      exam_importance: "Core Concept",
      content: null
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating folder:", error);
    throw new Error("Failed to create folder");
  }

  revalidatePath("/dashboard/notes");
  return { success: true, data };
}

export async function updateNoteContent(id, contentStr) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from("ib_notes")
    .update({ 
      content: contentStr,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating note content:", error);
    return { error: error.message };
  }
  
  return { success: true };
}

export async function updateNoteMetadata(id, formData) {
  const supabase = await createServerClient();
  
  const title = formData.get("title");
  const subject = formData.get("subject");
  const topic = formData.get("topic");
  const level = formData.get("level");

  const updates = { updated_at: new Date().toISOString() };
  if (title) updates.title = title;
  if (subject) updates.subject = subject;
  if (topic !== null) updates.topic = topic;
  if (level !== null) updates.level = level;

  const { error } = await supabase
    .from("ib_notes")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating metadata:", error);
    return { error: error.message };
  }
  
  revalidatePath("/dashboard/notes");
  revalidatePath(`/dashboard/notes/${id}`);
  return { success: true };
}

export async function deleteNote(id) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("ib_notes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting note:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/notes");
  redirect("/dashboard/notes");
}

export async function toggleNoteState(id, field, value) {
  const supabase = await createServerClient();
  const validFields = ["is_favorite", "is_pinned", "is_archived"];
  
  if (!validFields.includes(field)) {
    return { error: "Invalid field" };
  }

  const { error } = await supabase
    .from("ib_notes")
    .update({ [field]: value })
    .eq("id", id);

  if (error) {
    console.error(`Error toggling ${field}:`, error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/notes");
  revalidatePath(`/dashboard/notes/${id}`);
  return { success: true };
}

export async function duplicateNote(id) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: "Unauthorized" };

  // Fetch original note
  const { data: note, error: fetchError } = await supabase
    .from("ib_notes")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !note) {
    return { error: "Failed to find original note" };
  }

  // Insert copy
  const { data: newNote, error: insertError } = await supabase
    .from("ib_notes")
    .insert({
      user_id: user.id,
      title: `${note.title} (Copy)`,
      subject: note.subject,
      topic: note.topic,
      level: note.level,
      content: note.content,
      tags: note.tags,
    })
    .select()
    .single();

  if (insertError) {
    return { error: "Failed to duplicate note" };
  }

  revalidatePath("/dashboard/notes");
  redirect(`/dashboard/notes/${newNote.id}`);
}

export async function generateFlashcards(noteId, textContent) {
  // Extract simple flashcards as a fallback/mock logic.
  // In production, this would call an AI service.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: "Unauthorized" };

  // Fetch note metadata
  const { data: note } = await supabase
    .from("ib_notes")
    .select("subject, title")
    .eq("id", noteId)
    .single();

  // Basic NLP mock: split by sentences and generate simple Q/A pairs.
  const sentences = textContent.match(/[^.!?]+[.!?]+/g) || [];
  const cards = [];
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (sentence.length > 30) { // arbitrary threshold for meaningful sentences
      cards.push({
        user_id: user.id,
        note_id: noteId,
        subject: note?.subject || "General",
        front: `What is the significance of: "${sentence.substring(0, Math.min(40, sentence.length))}..."?`,
        back: sentence
      });
      if (cards.length >= 5) break; // Limit to 5 mock cards
    }
  }

  if (cards.length === 0) {
    return { error: "Not enough content to generate flashcards. Try writing more!" };
  }

  const { data, error } = await supabase
    .from("ib_flashcards")
    .insert(cards)
    .select();

  if (error) {
    console.error("Error generating flashcards:", error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/notes/${noteId}`);
  return { success: true, count: cards.length };
}

export async function analyzeNoteReadiness(noteId, textContent) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Advanced logic mock to simulate AI topic coverage evaluation
  // 1. Get length of content
  const wordCount = textContent.trim().split(/\s+/).length;
  let score = 0;

  // Base score on word count (up to 40%)
  if (wordCount > 500) score += 40;
  else if (wordCount > 200) score += 25;
  else if (wordCount > 50) score += 10;
  else score += 5;

  // 2. Fetch associated flashcards
  const { count: flashcardCount } = await supabase
    .from("ib_flashcards")
    .select("*", { count: 'exact', head: true })
    .eq("note_id", noteId);

  // Bonus for active recall generation (up to 30%)
  if (flashcardCount && flashcardCount > 5) score += 30;
  else if (flashcardCount && flashcardCount > 0) score += 15;

  // 3. Simulated AI Keyword Density & Structure Analysis (up to 30%)
  // In a real scenario, this calls OpenAI or Claude to compare against IB syllabus
  const hasHeadings = textContent.includes("#");
  const hasBulletPoints = textContent.includes("-") || textContent.includes("•");
  if (hasHeadings) score += 15;
  if (hasBulletPoints) score += 15;

  // Ensure score is capped
  score = Math.min(100, Math.max(10, score));

  // Save the calculated score
  const { error } = await supabase
    .from("ib_notes")
    .update({ revision_readiness: score })
    .eq("id", noteId);

  if (error) {
    console.error("Error updating readiness:", error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/notes/${noteId}`);
  revalidatePath("/dashboard/notes");
  return { success: true, score };
}
