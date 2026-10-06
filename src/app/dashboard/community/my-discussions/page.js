import { requireCompleteProfile } from "@/lib/auth";
import { fetchUserDiscussions, fetchUserActivitySummary, checkIsAdmin } from "../actions";
import MyDiscussionsClient from "./MyDiscussionsClient";

export const metadata = {
  title: "My Discussions — IB Nexus",
};

export default async function MyDiscussionsPage() {
  const { user } = await requireCompleteProfile();

  const [discussions, summary, isAdmin] = await Promise.all([
    fetchUserDiscussions(),
    fetchUserActivitySummary(),
    checkIsAdmin()
  ]);

  return <MyDiscussionsClient discussions={discussions} summary={summary} userId={user.id} isAdmin={isAdmin} />;
}
