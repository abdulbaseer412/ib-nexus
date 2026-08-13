import { requireAuth } from "@/lib/auth";
import { fetchDecksAction, fetchFlashcardStatsAction } from "./actions";
import FlashcardsClient from "./FlashcardsClient";

export const metadata = {
  title: "Flashcards | IB Nexus",
  description: "Advanced active-recall spaced repetition engine for IB subjects.",
};

export default async function FlashcardsPage() {
  await requireAuth();
  
  // Try fetching data, catch missing table errors smoothly (since we rely on a manual SQL migration)
  let decks = [];
  let stats = { total: 0, due: 0, mastered: 0, retention: 0 };
  let dbError = false;

  try {
    const [fetchedDecks, fetchedStats] = await Promise.all([
      fetchDecksAction(),
      fetchFlashcardStatsAction()
    ]);
    decks = fetchedDecks;
    stats = fetchedStats;
  } catch (error) {
    console.error("Flashcards page DB error (migration likely missing):", error);
    dbError = true;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <FlashcardsClient 
        initialDecks={decks} 
        initialStats={stats} 
        dbError={dbError} 
      />
    </div>
  );
}
