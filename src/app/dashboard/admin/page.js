import { requireAdmin } from "@/lib/auth/session";
import AdminClient from "./AdminClient";
import {
  fetchAdminOverviewStats,
  fetchAdminUsers,
  fetchAdminCommunityItems,
  fetchAdminRooms,
  fetchAdminActivityLogs,
  fetchWebsiteLockSettingsAction,
  fetchAdminModelConfigsAction,
  getWebsiteAccessAllowlist,
  fetchContactMessagesAction,
} from "./actions";

import { fetchAdminAiCoreVersionsAction, fetchAdminAiFeedbackAction } from "./ai-actions";
import { fetchGlobalSubjects } from "../subjects/actions";

export const metadata = {
  title: "Admin Control Center | IB Nexus",
  description: "Comprehensive website administration and content moderation for IB Nexus.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const { user, profile } = await requireAdmin();

  const results = await Promise.allSettled([
    fetchAdminOverviewStats(),
    fetchAdminUsers({ limit: 20 }),
    fetchAdminCommunityItems({ limit: 30 }),
    fetchAdminRooms(),
    fetchAdminActivityLogs({ limit: 30 }),
    fetchGlobalSubjects(),
    fetchWebsiteLockSettingsAction(),
    fetchAdminModelConfigsAction(),
    getWebsiteAccessAllowlist(),
    fetchAdminAiCoreVersionsAction(),
    fetchAdminAiFeedbackAction({ limit: 50 }),
    fetchContactMessagesAction(),
  ]);

  const statsRes = results[0].status === "fulfilled" ? results[0].value : { stats: {} };
  const usersRes = results[1].status === "fulfilled" ? results[1].value : { users: [] };
  const communityRes = results[2].status === "fulfilled" ? results[2].value : { items: [] };
  const roomsRes = results[3].status === "fulfilled" ? results[3].value : { rooms: [] };
  const logsRes = results[4].status === "fulfilled" ? results[4].value : { logs: [] };
  const subjectsRes = results[5].status === "fulfilled" ? results[5].value : [];
  const lockRes = results[6].status === "fulfilled" ? results[6].value : { settings: { is_locked: false, lock_message: null } };
  const modelsRes = results[7].status === "fulfilled" ? results[7].value : { models: [] };
  const allowlistRes = results[8].status === "fulfilled" ? results[8].value : { allowlist: [] };
  const aiCoreRes = results[9].status === "fulfilled" ? results[9].value : { versions: [] };
  const aiFeedbackRes = results[10].status === "fulfilled" ? results[10].value : { feedback: [] };
  const contactMessagesRes = results[11].status === "fulfilled" ? results[11].value : { messages: [] };

  const envEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminEmail = envEmail ? envEmail.trim().toLowerCase() : null;

  return (
    <AdminClient
      adminUser={user}
      adminProfile={profile}
      initialStats={statsRes.stats}
      initialUsers={usersRes.users || []}
      initialCommunityItems={communityRes.items || []}
      initialRooms={roomsRes.rooms || []}
      initialLogs={logsRes.logs || []}
      initialSubjects={subjectsRes || []}
      initialWebsiteSettings={lockRes.settings || { is_locked: false, lock_message: null }}
      initialModelConfigs={modelsRes.models || []}
      initialWebsiteAllowlist={allowlistRes.allowlist || []}
      initialCoreVersions={aiCoreRes.versions || []}
      initialAiFeedback={aiFeedbackRes.feedback || []}
      initialContactMessages={contactMessagesRes.messages || []}
      superAdminEmail={superAdminEmail}
    />
  );
}

