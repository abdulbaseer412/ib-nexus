/**
 * Re-exports from the canonical auth session module.
 * All imports of "@/lib/auth" continue to work without changes.
 */
export {
  getAuthUser,
  getAuthSession,
  requireAuth,
  requireCompleteProfile,
  requireAdmin,
  isCurrentUserAdmin,
  getPostAuthRedirect,
} from "@/lib/auth/session";
