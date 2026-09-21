import { requireCompleteProfile } from "@/lib/auth";
import { getProfile } from "@/lib/profile-service";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "Profile Settings — IB Nexus" };

export default async function ProfileSettingsPage() {
  const { user } = await requireCompleteProfile();
  const profile = await getProfile(user.id);
  
  return <ProfileClient profile={profile || {}} />;
}
