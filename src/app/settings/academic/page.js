import { redirect } from "next/navigation";

export default function AcademicSettingsRedirectPage() {
  redirect("/dashboard/subjects");
}
