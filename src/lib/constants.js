export const IB_PROGRAMS = [
  { value: "myp", label: "MYP (Middle Years Programme)", programme: "MYP" },
  { value: "dp", label: "DP (Diploma Programme)", programme: "DP" },
];

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/profile",
  "/settings",
];

// Auth routes that bypass the middleware redirect for authenticated users
// when they carry a recovery token (password reset flow).
export const RECOVERY_ROUTES = ["/auth/reset-password"];

export const AUTH_ROUTES = ["/login", "/signup"];

// ============================================================================
// IB NEXUS FEATURE LOCKING & PRESERVATION STATE
// All original implementations remain preserved and intact.
// Restored when features are explicitly unlocked (e.g. UNLOCK NOTES).
// ============================================================================
export const IS_APPLICATION_LOCKED = false;

export const FEATURE_FLAGS = {
  NOTES: true,
  FLASHCARDS: true,
  PLANNER: true,
  RESOURCES: true,
  COMMUNITY: true,
  LIVE_ROOMS: true,
  AI_TUTOR: true,
  ADMIN: true,
  SETTINGS: true,
  ONBOARDING: true,
};
