import { requireAuth } from "@/lib/auth";
import HelpClient from "./HelpClient";

export const metadata = { title: "Help & Support — IB Nexus" };

export default async function HelpSettingsPage() {
  const user = await requireAuth();
  
  return <HelpClient userEmail={user.email} />;
}
