"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import * as FlashcardService from "@/lib/flashcards-service";

export async function fetchDecksAction() {
  return await FlashcardService.getDecks();
}

export async function fetchDeckDetailsAction(deckId) {
  return await FlashcardService.getDeckDetails(deckId);
}

export async function fetchSmartReviewSessionAction() {
  return await FlashcardService.generateSmartReviewSession();
}

export async function fetchDeckReviewSessionAction(deckId) {
  return await FlashcardService.getDeckReviewSession(deckId);
}

export async function submitReviewAction(cardId, rating, durationMs) {
  const result = await FlashcardService.submitCardReview(cardId, rating, durationMs);
  revalidatePath("/dashboard/flashcards");
  return result;
}

export async function fetchFlashcardStatsAction() {
  return await FlashcardService.getFlashcardStats();
}

export async function createDeckAction(formData) {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  const title = formData.get("title");
  const subject = formData.get("subject");
  const description = formData.get("description");
  const topic = formData.get("topic");

  const { data, error } = await supabase.from("ib_flashcard_decks").insert({
    user_id: user.id,
    title,
    subject,
    description,
    topic
  }).select().single();

  if (error) {
    console.error("Create deck error:", error);
    throw new Error("Failed to create deck");
  }

  revalidatePath("/dashboard/flashcards");
  return data;
}

export async function deleteDeckAction(deckId) {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  const { error } = await supabase.from("ib_flashcard_decks")
    .delete()
    .eq("id", deckId)
    .eq("user_id", user.id);

  if (error) throw new Error("Failed to delete deck");

  revalidatePath("/dashboard/flashcards");
  return { success: true };
}

export async function createCardAction(deckId, front, back, priorityDate = null, sourceNoteId = null) {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  const { data, error } = await supabase.from("ib_flashcards").insert({
    user_id: user.id,
    deck_id: deckId,
    front,
    back,
    priority_date: priorityDate,
    note_id: sourceNoteId
  }).select().single();

  if (error) throw new Error("Failed to create card");

  revalidatePath("/dashboard/flashcards");
  return data;
}

export async function deleteCardAction(cardId) {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  const { error } = await supabase.from("ib_flashcards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (error) throw new Error("Failed to delete card");
  revalidatePath("/dashboard/flashcards");
  return { success: true };
}

export async function generateFlashcardsFromNotesAction() {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  // 1. Fetch all user notes
  const { data: notes, error: notesErr } = await supabase
    .from("ib_notes")
    .select("id, title, content, subject, topic")
    .eq("user_id", user.id)
    .not("content", "is", null);

  if (notesErr || !notes || notes.length === 0) {
    throw new Error("No notes found to analyze. Please write some notes first.");
  }

  // 2. Create an AI Nexus Card Deck
  const { data: deck, error: deckErr } = await supabase.from("ib_flashcard_decks").insert({
    user_id: user.id,
    title: "AI Extracted Knowledge",
    description: "High-yield active recall cards automatically generated from your notes by the Nexus AI.",
    subject: "Multi-Subject",
  }).select().single();

  if (deckErr) throw new Error("Failed to create AI Nexus Card");

  // 3. Extract heuristic flashcards
  const generatedCards = [];
  
  for (const note of notes) {
    const textContent = note.content;
    const sentences = textContent.match(/[^.!?]+[.!?]+/g) || [];
    
    // Pick up to 2 high-yield sentences per note
    let count = 0;
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      // Heuristic: sentences with definitions or keywords ("is", "means", "refers to")
      if (cleanSentence.length > 40 && (cleanSentence.includes(" is ") || cleanSentence.includes(" means ") || cleanSentence.includes(" refers to "))) {
        generatedCards.push({
          user_id: user.id,
          deck_id: deck.id,
          note_id: note.id,
          front: `Define or explain: "${cleanSentence.substring(0, 30)}..."`,
          back: cleanSentence,
          subject: note.subject,
          topic: note.topic,
          is_ai_generated: true,
          priority_date: new Date().toISOString() // High priority for review
        });
        count++;
        if (count >= 2) break;
      }
    }
  }

  if (generatedCards.length === 0) {
    throw new Error("Could not extract any high-yield concepts. Try adding more detailed notes with definitions.");
  }

  // 4. Insert cards
  const { error: insertErr } = await supabase.from("ib_flashcards").insert(generatedCards);
  if (insertErr) throw new Error("Failed to save AI generated cards");

  revalidatePath("/dashboard/flashcards");
  return { success: true, count: generatedCards.length, deckId: deck.id };
}

export async function updateCardStatusAction(cardId, status) {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  const { data, error } = await supabase.from("ib_flashcards")
    .update({ status })
    .eq("id", cardId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw new Error("Failed to update card status");
  
  // Call streak engine since they interacted with a card
  const { recordActivityAndStreak } = await import("@/lib/flashcards-service");
  await recordActivityAndStreak(user.id, supabase);

  revalidatePath("/dashboard/flashcards");
  return data;
}

export async function toggleAIPreferenceAction(enabled) {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  const { data, error } = await supabase.from("ib_flashcard_profiles")
    .upsert({ 
      user_id: user.id, 
      ai_generation_enabled: enabled,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error("Failed to update AI preference");
  revalidatePath("/dashboard/flashcards");
  return data;
}
