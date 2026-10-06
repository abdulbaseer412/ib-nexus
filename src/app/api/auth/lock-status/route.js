import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { getWebsiteLockSettings } from "@/lib/website-lock";
import { isUserApprovedForLockedSite } from "@/lib/website-access-allowlist";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { is_locked, lock_message } = await getWebsiteLockSettings();
    const { user, profile } = await getAuthSession();

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const userEmail = user?.email?.trim().toLowerCase();
    const isSuperAdmin = Boolean(superAdminEmail && userEmail === superAdminEmail);

    let isApproved = false;
    if (user && is_locked) {
      isApproved = await isUserApprovedForLockedSite(user, profile);
    }

    return NextResponse.json({
      isLocked: Boolean(is_locked),
      lockMessage: lock_message || null,
      isAuthenticated: Boolean(user),
      isApproved,
      isSuperAdmin,
      userEmail: user?.email || null,
    });
  } catch (error) {
    console.error("[API lock-status] Error:", error);
    return NextResponse.json({
      isLocked: false,
      lockMessage: null,
      isAuthenticated: false,
      isApproved: false,
      userEmail: null,
    });
  }
}
