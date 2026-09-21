import { requireCompleteProfile } from "@/lib/auth";
import { fetchUserAnswers, fetchUserActivitySummary, checkIsAdmin } from "../actions";
import MyAnswersClient from "./MyAnswersClient";

export const metadata = {
  title: "My Question Answers — IB Nexus",
};

export default async function MyAnswersPage() {
  const { user } = await requireCompleteProfile();

  const [answers, summary, isAdmin] = await Promise.all([
    fetchUserAnswers(),
    fetchUserActivitySummary(),
    checkIsAdmin()
  ]);

  return <MyAnswersClient answers={answers} summary={summary} userId={user.id} isAdmin={isAdmin} />;
}
