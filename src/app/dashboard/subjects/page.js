import { requireCompleteProfile } from "@/lib/auth";
import SubjectsClient from "./SubjectsClient";

export const metadata = { title: "Manage Subjects — IB Nexus" };

export default async function SubjectsPage() {
  const { profile } = await requireCompleteProfile();

  return <SubjectsClient profile={profile} />;
}
