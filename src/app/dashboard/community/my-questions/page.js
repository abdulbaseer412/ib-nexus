import { requireCompleteProfile } from "@/lib/auth";
import { fetchUserQuestions, fetchUserActivitySummary, checkIsAdmin } from "../actions";
import MyQuestionsClient from "./MyQuestionsClient";

export const metadata = {
  title: "My Questions — IB Nexus",
};

export default async function MyQuestionsPage() {
  const { user } = await requireCompleteProfile();

  const [questions, summary, isAdmin] = await Promise.all([
    fetchUserQuestions(),
    fetchUserActivitySummary(),
    checkIsAdmin()
  ]);

  return <MyQuestionsClient questions={questions} summary={summary} userId={user.id} isAdmin={isAdmin} />;
}
