/**
 * Returns structured authentication error details for UI rendering.
 *
 * Never exposes raw Supabase error codes, database schemas, or stack traces.
 */
export function getAuthErrorDetails(error, context = null) {
  if (!error) {
    return {
      type: "error",
      title: "Something went wrong",
      message: "An unexpected error occurred. Please try again.",
    };
  }

  const rawMessage = typeof error === "string" ? error : error?.message || "";
  const message = rawMessage.toLowerCase();
  const code = (error?.code || "").toString().toLowerCase();

  // Network / Server problems (Scenario 6)
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("timeout") ||
    message.includes("server unavailable") ||
    message.includes("connection") ||
    message.includes("service unavailable") ||
    message.includes("unexpected exception") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    code === "fetch_error" ||
    code === "network_error"
  ) {
    return {
      type: "network",
      title: "Connection problem",
      message:
        "We couldn't reach the server right now. Please check your internet connection or try again in a moment.",
    };
  }

  // Rate limiting (Scenario 7)
  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("too many attempts") ||
    message.includes("too many") ||
    message.includes("over_email_send_rate_limit") ||
    message.includes("over_request_rate_limit") ||
    message.includes("email rate limit") ||
    code === "429" ||
    code === "too_many_requests" ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return {
      type: "rate_limit",
      title: "Slow down",
      message: "Too many attempts. Please wait a moment before trying again.",
    };
  }

  // No account found (Scenario 1) — checked before wrong_password to avoid
  // the catch-all swallowing Google no-account rejections.
  if (
    message.includes("user not found") ||
    message.includes("no user found") ||
    message.includes("no account found") ||
    message.includes("couldn't find an ib nexus account") ||
    message.includes("create an account first") ||
    code === "user_not_found"
  ) {
    return {
      type: "no_account",
      title: "No account found",
      message:
        "We couldn't find an IB Nexus account associated with this Google account. Please create an account first.",
    };
  }

  // Account already exists (Scenario 2)
  if (
    message.includes("user already registered") ||
    message.includes("already been registered") ||
    message.includes("email address is already registered") ||
    message.includes("user_already_exists") ||
    message.includes("account already exists") ||
    code === "user_already_exists"
  ) {
    return {
      type: "duplicate",
      title: "Account already exists",
      message: "An IB Nexus account already exists with this email address.",
    };
  }

  // Wrong password (Scenario 3)
  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password") ||
    message.includes("incorrect password") ||
    message.includes("invalid_grant") ||
    code === "invalid_credentials"
  ) {
    return {
      type: "wrong_password",
      title: "Incorrect password",
      message: "The password you entered is incorrect.",
    };
  }

  // Disabled Email login (Scenario 4)
  if (
    message.includes("email sign-in has been disabled") ||
    message.includes("email_disabled") ||
    message.includes("email password sign-in disabled")
  ) {
    return {
      type: "email_disabled",
      title: "Email sign-in disabled",
      message:
        "Email and password sign-in has been disabled for this account. Please use your linked sign-in method.",
    };
  }

  // Disabled Google login (Scenario 5)
  if (
    message.includes("google sign-in has been disabled") ||
    message.includes("google_disabled")
  ) {
    return {
      type: "google_disabled",
      title: "Google sign-in disabled",
      message:
        "Google sign-in has been disabled for this account. Please sign in with your email and password.",
    };
  }

  // Email verification (Scenario 8)
  if (
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed") ||
    message.includes("unconfirmed_email")
  ) {
    return {
      type: "email_unconfirmed",
      title: "Email verification required",
      message:
        "Please check your inbox to confirm your email address before signing in.",
    };
  }

  // OAuth Account Already Linked
  if (
    message.includes("already linked") ||
    message.includes("already been linked") ||
    message.includes("identity already exists") ||
    message.includes("identity is already linked") ||
    message.includes("already associated") ||
    message.includes("belongs to another user")
  ) {
    return {
      type: "warning",
      title: "Account already linked",
      message:
        "This Google account is already linked to another IB Nexus account. Please choose a different Google account or sign in directly using that account.",
    };
  }

  // OAuth Cancelled
  if (
    message.includes("access_denied") ||
    message.includes("cancelled") ||
    message.includes("canceled")
  ) {
    return {
      type: "info",
      title: "Sign-in cancelled",
      message: "Google sign-in was cancelled.",
    };
  }

  // Password Strength
  if (message.includes("password") && message.includes("weak")) {
    return {
      type: "warning",
      title: "Password too weak",
      message:
        "Password is too weak. Use at least 8 characters with letters and numbers.",
    };
  }

  // Same Password
  if (
    message.includes("same password") ||
    message.includes("should be different") ||
    message.includes("different from") ||
    message.includes("must be different") ||
    message.includes("same_password")
  ) {
    return {
      type: "warning",
      title: "New password required",
      message: "Your new password must be different from your current password.",
    };
  }

  // Expired / Invalid Token
  if (message.includes("expired") || message.includes("token is expired")) {
    return {
      type: "warning",
      title: "Link expired",
      message:
        "This reset link has expired or already been used. Please request a new one.",
    };
  }

  // Signup Disabled
  if (
    message.includes("signup is disabled") ||
    message.includes("sign up is disabled")
  ) {
    return {
      type: "warning",
      title: "Sign-up disabled",
      message: "Sign up is currently unavailable. Please contact support.",
    };
  }

  // Email delivery / SMTP failures
  if (
    message.includes("sending confirmation") ||
    message.includes("confirmation mail") ||
    message.includes("confirmation email") ||
    message.includes("sending email") ||
    message.includes("send email") ||
    message.includes("smtp") ||
    message.includes("email delivery") ||
    message.includes("unable to send") ||
    message.includes("error sending") ||
    message.includes("mail") ||
    message.includes("email provider") ||
    code === "email_send_failed" ||
    code === "smtp_error" ||
    (error?.status === 500 && (message.includes("email") || message.includes("mail")))
  ) {
    return {
      type: "error",
      title: "Email delivery failed",
      message:
        "We couldn't send the verification email. Please try again in a moment.",
    };
  }

  // Unexpected server error from Supabase (500, etc.)
  if (
    message.includes("unexpected") ||
    message.includes("internal server") ||
    message.includes("server error") ||
    code === "unexpected_failure" ||
    code === "internal_error"
  ) {
    return {
      type: "error",
      title: "Server error",
      message:
        "Something went wrong on our end. Please try again in a moment.",
    };
  }

  // Catch-all: Safe, non-technical default message (NEVER EXPOSE RAW SUPABASE ERRORS)
  // Log the raw error server-side for debugging
  console.error("[auth-errors] Unhandled auth error:", rawMessage, "code:", code);
  return {
    type: "error",
    title: "Authentication issue",
    message:
      "We couldn't complete your request right now. Please try again or contact support if the issue persists.",
  };
}

export function mapAuthError(error, context = null) {
  const details = getAuthErrorDetails(error, context);
  return details.message;
}
