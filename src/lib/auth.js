/**
 * Re-exports from the canonical auth session module.
 * All imports of "@/lib/auth" continue to work without changes.
 */
export {
  getAuthUser,
  getAuthSession,
  requireAuth,
  requireCompleteProfile,
  getPostAuthRedirect,
} from "@/lib/auth/session";
