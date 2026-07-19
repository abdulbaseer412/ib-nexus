const isDev = process.env.NODE_ENV === "development";

export function exposeError(error, fallback, context) {
  if (!isDev) {
    return fallback;
  }

  if (!error) {
    return `[${context}] Unknown error`;
  }

  const parts = [context];

  if (typeof error === "string") {
    parts.push(error);
  } else {
    if (error.message) parts.push(error.message);
    if (error.code) parts.push(`code=${error.code}`);
    if (error.details) parts.push(error.details);
    if (error.hint) parts.push(`hint=${error.hint}`);
  }

  return parts.join(" — ");
}

export function exposeAuthError(error, fallback, context) {
  return exposeError(error, fallback, context);
}
