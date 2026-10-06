import { requireCompleteProfile } from "@/lib/auth/session";
import { fetchGlobalSubjects } from "@/app/dashboard/subjects/actions";
import AiTutorWorkspace from "@/components/dashboard/ai/AiTutorWorkspace";

export const metadata = {
  title: "Nexus AI | IB Nexus",
  description:
    "Your personal IB academic AI assistant. Get structured explanations, practice questions, flashcards, and study guidance powered by Nexus AI.",
};

export default async function AiPage() {
  const { profile } = await requireCompleteProfile();

  // Load canonical subject catalog for the subject picker
  let allSubjects = [];
  try {
    allSubjects = await fetchGlobalSubjects();
  } catch {
    // Non-blocking — subject picker will still show user's enrolled subjects
  }

  return (
    <AiTutorWorkspace
      userProfile={profile}
      allSubjects={allSubjects}
    />
  );
}
