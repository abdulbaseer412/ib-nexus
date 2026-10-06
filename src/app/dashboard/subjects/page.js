import { requireCompleteProfile } from "@/lib/auth";
import { getProfile } from "@/lib/profile-service";
import SubjectsClient from "./SubjectsClient";
import { fetchGlobalSubjects } from "./actions";
import { checkIsAdmin } from "../community/actions";

export const metadata = { title: "Manage Subjects — IB Nexus" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubjectsPage() {
  const { user } = await requireCompleteProfile();
  const [profile, globalSubjects, isAdmin] = await Promise.all([
    getProfile(user.id),
    fetchGlobalSubjects(),
    checkIsAdmin(),
  ]);

  return <SubjectsClient profile={profile || {}} globalSubjects={globalSubjects || []} isAdmin={isAdmin} />;
}
