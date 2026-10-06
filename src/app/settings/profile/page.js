import { requireCompleteProfile } from "@/lib/auth";
import { getProfile } from "@/lib/profile-service";
import { fetchGlobalSubjects } from "@/app/dashboard/subjects/actions";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "Profile & Academics Settings — IB Nexus" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfileSettingsPage() {
  const { user } = await requireCompleteProfile();
  const [profile, globalSubjects] = await Promise.all([
    getProfile(user.id),
    fetchGlobalSubjects(),
  ]);
  
  return <ProfileClient profile={profile || {}} globalSubjects={globalSubjects || []} />;
}

