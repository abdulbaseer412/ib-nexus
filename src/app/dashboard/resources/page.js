import { requireCompleteProfile } from "@/lib/auth";
import { getProfile } from "@/lib/profile-service";
import { checkIsAdmin } from "../community/actions";
import { fetchGlobalSubjects } from "../subjects/actions";
import { Suspense } from "react";
import ResourcesClient from "./ResourcesClient";

export const metadata = {
  title: "Resources — IB Nexus",
  description: "Your IB study library — past papers, markschemes, revision guides, and more.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResourcesPage() {
  const { user } = await requireCompleteProfile();
  const [profile, isAdmin, globalSubjects] = await Promise.all([
    getProfile(user.id),
    checkIsAdmin(),
    fetchGlobalSubjects(),
  ]);

  const activeProgram = (profile?.ib_program || "dp").toLowerCase().includes("myp") ? "myp" : "dp";

  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">Loading resources...</div>}>
      <ResourcesClient
        userProfile={profile || {}}
        userProgram={activeProgram}
        isAdmin={isAdmin || profile?.is_admin === true}
        userSubjects={profile?.subjects || []}
        globalSubjects={globalSubjects || []}
      />
    </Suspense>
  );
}
