import { requireCompleteProfile } from "@/lib/auth";
import { Suspense } from "react";
import ResourcesClient from "./ResourcesClient";

export const metadata = {
  title: "Resources — IB Nexus",
  description: "Your IB study library — past papers, markschemes, revision guides, and more.",
};

export default async function ResourcesPage() {
  const { profile } = await requireCompleteProfile();

  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">Loading resources...</div>}>
      <ResourcesClient
        userProfile={profile}
        userProgram={profile?.programme?.toLowerCase() || (profile?.ib_program?.toLowerCase().includes("myp") ? "myp" : "dp")}
        isAdmin={profile?.is_admin === true}
        userSubjects={profile?.subjects || []}
      />
    </Suspense>
  );
}
