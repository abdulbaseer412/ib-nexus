import { requireCompleteProfile } from "@/lib/auth";
import { fetchApprovedPosts, fetchRooms, fetchActiveStudentsPerSubject, fetchStudyGroups, checkIsAdmin, fetchStudyGroupPresenceCounts } from "./actions";
import CommunityClient from "./CommunityClient";

export const metadata = { title: "Community — IB Nexus" };

export default async function CommunityPage() {
  const { user, profile } = await requireCompleteProfile();

  const [posts, rooms, activeStudents, studyGroups, studyGroupPresence, isAdmin] = await Promise.all([
    fetchApprovedPosts({ limit: 30 }),
    fetchRooms(),
    fetchActiveStudentsPerSubject(),
    fetchStudyGroups(),
    fetchStudyGroupPresenceCounts(),
    checkIsAdmin(),
  ]);

  return (
    <CommunityClient
      initialPosts={posts}
      rooms={rooms}
      activeStudents={activeStudents}
      studyGroups={studyGroups}
      studyGroupPresence={studyGroupPresence}
      userId={user.id}
      userProfile={profile}
      isAdmin={isAdmin}
    />
  );
}
