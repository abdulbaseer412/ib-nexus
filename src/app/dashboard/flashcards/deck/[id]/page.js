import { requireAuth } from "@/lib/auth";
import { fetchDeckDetailsAction } from "../../actions";
import { notFound } from "next/navigation";
import DeckClient from "./DeckClient";

export default async function DeckPage({ params }) {
  await requireAuth();
  
  const deck = await fetchDeckDetailsAction(params.id);
  
  if (!deck) {
    notFound();
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <DeckClient initialDeck={deck} />
    </div>
  );
}
