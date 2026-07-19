export const IB_PROGRAMS = [
  { value: "myp", label: "MYP (Middle Years Programme)" },
  { value: "dp", label: "DP (Diploma Programme)" },
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
