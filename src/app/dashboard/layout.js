import { requireCompleteProfile } from "@/lib/auth";
import DashboardSidebar from "@/components/DashboardSidebar";
export default async function DashboardLayout({children}) { 
  const { profile } = await requireCompleteProfile(); 
  return (
    <div className="dashboard-shell">
      <DashboardSidebar profile={profile} />
      <div className="dashboard-content min-h-[calc(100vh-72px)]">{children}</div>
    </div>
  ); 
}
