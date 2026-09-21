import { requireCompleteProfile } from "@/lib/auth";
import { Suspense } from "react";
import ResourceDetailClient from "./ResourceDetailClient";

export async function generateMetadata({ params }) {
  return { title: "Resource — IB Nexus" };
}

export default async function ResourceDetailPage({ params }) {
  const { profile } = await requireCompleteProfile();
  const { id } = await params;

  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">Loading resource...</div>}>
      <ResourceDetailClient
        resourceId={id}
        userProgram={profile?.ib_program?.toLowerCase()}
        isAdmin={profile?.is_admin === true}
        userSubjects={profile?.subjects || []}
      />
    </Suspense>
  );
}
