import { requireAuth, requireCompleteProfile } from "@/lib/auth";
import { getNotes } from "./actions";
import NotesClient from "./NotesClient";

export const metadata = {
  title: "Notes | IB Nexus",
  description: "Organise your revision notes, class material, and study guides by subject.",
};

export default async function NotesPage() {
  await requireAuth();
  const { profile } = await requireCompleteProfile();
  const notes = await getNotes();
  
  return <NotesClient initialNotes={notes} userProgram={profile?.ib_program?.toLowerCase()} />;
}
