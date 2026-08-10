import { requireCompleteProfile } from "@/lib/auth";
import { fetchMyPosts, fetchMyReplies, checkIsAdmin } from "../actions";
import MyPostsClient from "./MyPostsClient";

export const metadata = {
  title: "My Discussions — IB Nexus",
};

export default async function MyDiscussionsPage() {
  const { user } = await requireCompleteProfile();

  const [posts, replies, isAdmin] = await Promise.all([
    fetchMyPosts(),
    fetchMyReplies(),
    checkIsAdmin()
  ]);

  return <MyPostsClient posts={posts} replies={replies} userId={user.id} isAdmin={isAdmin} />;
}
