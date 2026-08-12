import { requireCompleteProfile } from "@/lib/auth";
import { fetchPostById, fetchReplies, checkIsAdmin } from "../actions";
import { notFound } from "next/navigation";
import DiscussionClient from "./DiscussionClient";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const post = await fetchPostById(id);
  return { title: post ? `${post.title} — Nexus Network — IB Nexus` : "Discussion — IB Nexus" };
}

export default async function DiscussionPage({ params }) {
  const { id } = await params;
  const { user, profile } = await requireCompleteProfile();

  const [post, replies, isAdmin] = await Promise.all([
    fetchPostById(id),
    fetchReplies(id),
    checkIsAdmin()
  ]);
  
  if (!post) notFound();

  return (
    <DiscussionClient
      post={post}
      replies={replies}
      userId={user.id}
      userProfile={profile}
      isAdmin={isAdmin}
    />
  );
}
