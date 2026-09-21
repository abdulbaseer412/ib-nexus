import { requireCompleteProfile } from "@/lib/auth";
import HelpClient from "./HelpClient";

export const metadata = { title: "Help & Support — IB Nexus" };

export default async function HelpSettingsPage() {
  const { user, profile } = await requireCompleteProfile();
  
  return <HelpClient userEmail={user.email} userName={profile.full_name || "User"} />;
}
