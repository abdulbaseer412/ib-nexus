import { requireCompleteProfile } from "@/lib/auth";
import SubjectsClient from "./SubjectsClient";
import { fetchGlobalSubjects } from "./actions";
import { checkIsAdmin } from "../community/actions";

export const metadata = { title: "Manage Subjects — IB Nexus" };

export default async function SubjectsPage() {
  const { profile } = await requireCompleteProfile();
  const globalSubjects = await fetchGlobalSubjects();
  const isAdmin = await checkIsAdmin();

  return <SubjectsClient profile={profile} globalSubjects={globalSubjects} isAdmin={isAdmin} />;
}
