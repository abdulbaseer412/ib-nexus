import { createAdminClient } from "@/lib/supabase/admin";

let cachedOrgId = null;
let cachedFallbackActorId = null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getGlobalOrgId(admin) {
  if (cachedOrgId) return cachedOrgId;
  try {
    const { data: orgs } = await admin.from("organizations").select("id").limit(1);
    if (orgs && orgs.length > 0 && orgs[0].id) {
      cachedOrgId = orgs[0].id;
      return cachedOrgId;
    }
  } catch (e) {
    // fallback
  }
  cachedOrgId = "d1e39659-cb2c-4276-b860-1650bb41be1f";
  return cachedOrgId;
}

async function getFallbackActorId(admin) {
  if (cachedFallbackActorId) return cachedFallbackActorId;
  try {
    const { data: admins } = await admin.from("profiles").select("id").eq("is_admin", true).limit(1);
    if (admins && admins.length > 0 && admins[0].id) {
      cachedFallbackActorId = admins[0].id;
      return cachedFallbackActorId;
    }
  } catch (e) {
    // fallback
  }
  cachedFallbackActorId = "5240e88c-a207-4d04-aea8-c867f2eba0d7";
  return cachedFallbackActorId;
}

/**
 * Centrally log any administrative or moderation action into Supabase audit_logs.
 * Ensures all additions, edits, deletions, and config changes are accurately tracked.
 */
export async function logAdminActivity({
  actorId,
  actorEmail,
  actorName,
  action,
  targetType = "general",
  targetId = null,
  details = "",
  metadata = {},
}) {
  try {
    const admin = createAdminClient();
    const orgId = await getGlobalOrgId(admin);

    let validActorId = actorId;
    if (!validActorId || typeof validActorId !== "string" || !UUID_REGEX.test(validActorId)) {
      validActorId = await getFallbackActorId(admin);
    }

    const isTargetUserUUID = targetType === "user" && typeof targetId === "string" && UUID_REGEX.test(targetId);

    const payload = {
      organization_id: orgId,
      actor_id: validActorId,
      target_user_id: isTargetUserUUID ? targetId : null,
      action: action || "ADMIN_ACTION",
      impersonation: false,
      metadata: {
        ...metadata,
        actor_email: actorEmail || "admin@ibnexus.com",
        actor_name: actorName || "Admin",
        target_type: targetType,
        target_id: targetId,
        details: details || action,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    const { data, error } = await admin.from("audit_logs").insert(payload).select().single();
    if (error) {
      console.warn("[audit-logger] Failed to insert audit log:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, log: data };
  } catch (err) {
    console.warn("[audit-logger] Exception writing audit log:", err.message);
    return { success: false, error: err.message };
  }
}
