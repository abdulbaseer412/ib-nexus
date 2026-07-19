export function mapAuthError(error) {
  if (!error?.message) {
    return "Something went wrong. Please try again.";
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return "Incorrect email or password. Please try again.";
  }

  if (
    message.includes("user already registered") ||
    message.includes("already been registered") ||
    message.includes("email address is already registered")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for the confirmation link.";
  }

  if (message.includes("user not found")) {
    return "No account found with this email. Try signing up instead.";
  }

  if (message.includes("password") && message.includes("weak")) {
    return "Password is too weak. Use at least 8 characters with letters and numbers.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (message.includes("signup is disabled")) {
    return "Sign up is currently unavailable. Please contact support.";
  }

  return error.message;
}
