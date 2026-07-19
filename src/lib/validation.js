export function validateEmail(email) {
  const trimmed = email?.trim() ?? "";
  if (!trimmed) {
    return { valid: false, error: "Email is required." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  return { valid: true, value: trimmed };
}

export function validateName(name) {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) {
    return { valid: false, error: "Name is required." };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters." };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "Name must be 50 characters or fewer." };
  }
  return { valid: true, value: trimmed };
}

export function validatePassword(password) {
  if (!password) {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters." };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number." };
  }
  return { valid: true };
}

export function validatePasswordMatch(password, confirmPassword) {
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match." };
  }
  return { valid: true };
}
