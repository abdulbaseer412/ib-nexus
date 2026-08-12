import { requireAuth } from "@/lib/auth";
import { getNote, getNotes } from "../actions";
import NoteEditorClient from "./NoteEditorClient";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Note Editor | IB Nexus",
};

export default async function NoteEditorPage({ params }) {
  await requireAuth();
  const note = await getNote(params.id);
  
  if (!note) {
    notFound();
  }

  // Fetch all notes to pass to the sidebar/connections view
  const allNotes = await getNotes();
  
  return <NoteEditorClient initialNote={note} allNotes={allNotes} />;
}
