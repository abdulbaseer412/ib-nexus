import { requireAuth } from "@/lib/auth";
import { fetchSmartReviewSessionAction, fetchDeckReviewSessionAction } from "../actions";
import { redirect } from "next/navigation";
import ReviewClient from "./ReviewClient";

export default async function ReviewPage({ searchParams }) {
  await requireAuth();
  
  const mode = searchParams.mode; // 'smart', 'weak', etc.
  const deckId = searchParams.deck;

  let sessionCards = [];

  try {
    if (mode === "smart" || mode === "weak") {
      sessionCards = await fetchSmartReviewSessionAction();
    } else if (deckId) {
      sessionCards = await fetchDeckReviewSessionAction(deckId);
    } else {
      // Fallback to smart review
      sessionCards = await fetchSmartReviewSessionAction();
    }
  } catch (e) {
    console.error("Failed to load review session:", e);
  }

  // If no cards are due, redirect back to flashcards home
  if (sessionCards.length === 0) {
    redirect("/dashboard/flashcards");
  }

  return (
    <div className="flex-1 overflow-hidden bg-black/50">
      <ReviewClient initialCards={sessionCards} mode={mode} deckId={deckId} />
    </div>
  );
}
