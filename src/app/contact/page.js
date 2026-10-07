import { createServerClient } from "@/lib/supabase/server";
import ContactClient from "./ContactClient";

export const metadata = {
  title: "Contact Support & Inquiries — IB Nexus",
  description: "Get in touch with the IB Nexus team and founder Abdul Baseer. Fast, friendly support for students, educators, and schools worldwide.",
};

export default async function ContactPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const userEmail = user?.email || "";
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";

  return <ContactClient userEmail={userEmail} userName={userName} />;
}
