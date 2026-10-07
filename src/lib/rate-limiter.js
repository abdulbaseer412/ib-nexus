/**
 * IB Nexus In-Memory Rate Limiter
 * Provides sliding-window rate limiting for Edge and Node.js server routes.
 */

const tracker = new Map();

// Periodic garbage collection to prevent memory leaks in long-running processes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of tracker.entries()) {
      if (now - record.resetTime > 0) {
        tracker.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Clean up every 5 minutes
}

/**
 * Check if a request exceeds the allowed rate limit.
 * 
 * @param {string} key - Unique identifier (e.g. IP address, User ID)
 * @param {object} options
 * @param {number} options.maxRequests - Max requests allowed within window (default: 30)
 * @param {number} options.windowMs - Window duration in milliseconds (default: 60000 = 1 min)
 * @returns {{ success: boolean, limit: number, remaining: number, resetInMs: number }}
 */
export function checkRateLimit(key, options = {}) {
  const maxRequests = options.maxRequests || 30;
  const windowMs = options.windowMs || 60 * 1000;
  const now = Date.now();

  let record = tracker.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    tracker.set(key, record);
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetInMs: windowMs,
    };
  }

  record.count += 1;

  if (record.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetInMs: Math.max(0, record.resetTime - now),
    };
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    resetInMs: Math.max(0, record.resetTime - now),
  };
}

/**
 * Helper to extract client IP address from request headers
 */
export function getClientIp(request) {
  if (!request) return "127.0.0.1";
  const forwarded = request.headers?.get?.("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers?.get?.("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}
