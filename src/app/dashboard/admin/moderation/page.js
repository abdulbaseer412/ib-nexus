import { requireCompleteProfile } from "@/lib/auth";
import { fetchModerationCounts, fetchPostsForModeration, fetchStudyGroupsForModeration, checkIsAdmin } from "../../community/actions";
import { redirect } from "next/navigation";
import ModerationClient from "./ModerationClient";

export const metadata = { title: "Moderation — IB Nexus" };

export default async function ModerationPage() {
  const { user, profile } = await requireCompleteProfile();

  // Double check admin status
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [counts, initialPending, initialPendingStudyGroups] = await Promise.all([
    fetchModerationCounts(),
    fetchPostsForModeration("pending"),
    fetchStudyGroupsForModeration("pending"),
  ]);

  return (
    <ModerationClient
      initialPending={initialPending}
      initialPendingStudyGroups={initialPendingStudyGroups}
      counts={counts}
      userId={user.id}
    />
  );
}
