import { requireCompleteProfile } from "@/lib/auth";
import { getProfile } from "@/lib/profile-service";
import { checkIsAdmin } from "../../community/actions";
import { Suspense } from "react";
import ResourceDetailClient from "./ResourceDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }) {
  return { title: "Resource — IB Nexus" };
}

export default async function ResourceDetailPage({ params }) {
  const { user } = await requireCompleteProfile();
  const [profile, isAdmin] = await Promise.all([
    getProfile(user.id),
    checkIsAdmin(),
  ]);
  const { id } = await params;

  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">Loading resource...</div>}>
      <ResourceDetailClient
        resourceId={id}
        userProgram={profile?.ib_program?.toLowerCase()}
        isAdmin={isAdmin || profile?.is_admin === true}
        userSubjects={profile?.subjects || []}
        userProfile={profile || {}}
      />
    </Suspense>
  );
}
