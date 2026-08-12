import { requireCompleteProfile } from "@/lib/auth";
import { fetchApprovedPosts, fetchRooms, fetchActiveStudentsPerSubject, fetchStudyGroups, checkIsAdmin, fetchStudyGroupPresenceCounts, fetchSubjects } from "./actions";
import CommunityClient from "./CommunityClient";

export const metadata = { title: "Nexus Network — IB Nexus" };

export default async function CommunityPage() {
  const { user, profile } = await requireCompleteProfile();

  const [posts, rooms, activeStudents, studyGroups, studyGroupPresence, isAdmin, subjects] = await Promise.all([
    fetchApprovedPosts({ limit: 30 }),
    fetchRooms(),
    fetchActiveStudentsPerSubject(),
    fetchStudyGroups(),
    fetchStudyGroupPresenceCounts(),
    checkIsAdmin(),
    fetchSubjects(),
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
      subjects={subjects}
    />
  );
}
