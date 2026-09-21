import { requireCompleteProfile } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchRoomMessages,
  fetchRoomPresence,
  checkIsAdmin,
} from "../../actions";
import StudyGroupClient from "./StudyGroupClient";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("community_study_groups").select("name").eq("id", id).single();
  return {
    title: data ? `${data.name} — Study Group — IB Nexus` : "Study Group — IB Nexus",
  };
}

export default async function StudyGroupPage({ params }) {
  const { id } = await params;
  const { user, profile } = await requireCompleteProfile();

  const supabase = createAdminClient();
  const { data: group } = await supabase
    .from("community_study_groups")
    .select("*, community_study_group_members(user_id)")
    .eq("id", id)
    .single();

  if (!group || !group.is_active) notFound();

  // If user is not a member, auto-join them
  const isMember = group.community_study_group_members?.some(m => m.user_id === user.id);
  if (!isMember) {
    await supabase.from("community_study_group_members").insert({
      group_id: id,
      user_id: user.id
    });
    redirect(`/dashboard/community/study-groups/${id}`);
  }

  const [messages, presence, isAdmin] = await Promise.all([
    fetchRoomMessages(id, 80),
    fetchRoomPresence(id),
    checkIsAdmin(),
  ]);

  const memberCount = group.community_study_group_members?.length || 0;

  return (
    <StudyGroupClient
      group={group}
      initialMessages={messages}
      initialPresence={presence}
      memberCount={memberCount}
      userId={user.id}
      userProfile={profile}
      isAdmin={isAdmin}
    />
  );
}
