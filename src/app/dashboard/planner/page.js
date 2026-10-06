import PlannerClient from "@/components/dashboard/PlannerClient";
import { Suspense } from "react";
import { requireCompleteProfile } from "@/lib/auth";

export default async function Planner(){
  const { profile } = await requireCompleteProfile();
  
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">Loading planner...</div>}>
      <PlannerClient userProgram={profile?.ib_program?.toLowerCase()} />
    </Suspense>
  );
}
