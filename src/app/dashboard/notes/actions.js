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

  if (!title || !subject) {
    throw new Error("Title and Subject are required");
  }

  const { data, error } = await supabase
    .from("ib_notes")
    .insert({
      user_id: user.id,
      title,
      subject,
      topic,
      level,
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph' }]
      })
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
