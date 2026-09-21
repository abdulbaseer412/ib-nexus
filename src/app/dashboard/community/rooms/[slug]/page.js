import { requireCompleteProfile } from "@/lib/auth";
import { notFound } from "next/navigation";
import {
  fetchRoomBySlug,
  fetchPostsBySubject,
  fetchTrendingForSubject,
  fetchRoomMessages,
  fetchRoomPresence,
  fetchRoomMemberCount,
  checkIsAdmin,
} from "../../actions";
import RoomClient from "./RoomClient";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const room = await fetchRoomBySlug(slug);
  return {
    title: room ? `${room.name} — Nexus Network — IB Nexus` : "Room — IB Nexus",
  };
}

export default async function RoomPage({ params }) {
  const { slug } = await params;
  const { user, profile } = await requireCompleteProfile();

  const room = await fetchRoomBySlug(slug);
  if (!room) notFound();

  const [posts, trending, messages, presence, memberCount, isAdmin] =
    await Promise.all([
      fetchPostsBySubject(room.subject, { limit: 20 }),
      fetchTrendingForSubject(room.subject, 3),
      fetchRoomMessages(room.id, 80),
      fetchRoomPresence(room.id),
      fetchRoomMemberCount(room.id),
      checkIsAdmin(),
    ]);

  return (
    <RoomClient
      room={room}
      initialPosts={posts}
      trending={trending}
      initialMessages={messages}
      initialPresence={presence}
      memberCount={memberCount}
      userId={user.id}
      userProfile={profile}
      isAdmin={isAdmin}
    />
  );
}
