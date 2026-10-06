import { requireCompleteProfile } from "@/lib/auth";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings — IB Nexus",
};

export default async function SettingsPage() {
  await requireCompleteProfile();

  return <SettingsClient />;
}
