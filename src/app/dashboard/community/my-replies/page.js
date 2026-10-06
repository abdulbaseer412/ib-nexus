import { requireCompleteProfile } from "@/lib/auth";
import { fetchUserReplies, fetchUserActivitySummary, checkIsAdmin } from "../actions";
import MyRepliesClient from "./MyRepliesClient";

export const metadata = {
  title: "My Discussion Replies — IB Nexus",
};

export default async function MyRepliesPage() {
  const { user } = await requireCompleteProfile();

  const [replies, summary, isAdmin] = await Promise.all([
    fetchUserReplies(),
    fetchUserActivitySummary(),
    checkIsAdmin()
  ]);

  return <MyRepliesClient replies={replies} summary={summary} userId={user.id} isAdmin={isAdmin} />;
}
