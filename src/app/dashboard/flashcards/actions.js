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
  const supabase = createServerClient();

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
  const supabase = createServerClient();

  const { error } = await supabase.from("ib_flashcard_decks")
    .delete()
    .eq("id", deckId)
    .eq("user_id", user.id);

  if (error) throw new Error("Failed to delete deck");

  revalidatePath("/dashboard/flashcards");
  return { success: true };
}

export async function createCardAction(deckId, front, back, sourceNoteId = null) {
  const user = await getAuthUser();
  const supabase = createServerClient();

  const { data, error } = await supabase.from("ib_flashcards").insert({
    user_id: user.id,
    deck_id: deckId,
    front,
    back,
    note_id: sourceNoteId
  }).select().single();

  if (error) throw new Error("Failed to create card");

  revalidatePath("/dashboard/flashcards");
  return data;
}

export async function deleteCardAction(cardId) {
  const user = await getAuthUser();
  const supabase = createServerClient();

  const { error } = await supabase.from("ib_flashcards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (error) throw new Error("Failed to delete card");
  revalidatePath("/dashboard/flashcards");
  return { success: true };
}
