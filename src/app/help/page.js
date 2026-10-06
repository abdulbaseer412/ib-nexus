import { getAuthUser } from "@/lib/auth";
import HelpCenterClient from "./HelpCenterClient";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Help Centre & Knowledge Base — IB Nexus",
  description: "Find comprehensive guides, study tool walkthroughs, account support, and student community FAQs for IB Nexus.",
};

export default async function HelpPage() {
  const user = await getAuthUser();

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      <main className="flex-1">
        <HelpCenterClient initialUser={user ? { id: user.id, email: user.email } : null} />
      </main>
      <PublicFooter />
    </div>
  );
}
