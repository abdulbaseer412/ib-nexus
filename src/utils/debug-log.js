export function debugLog(label, payload) {
  // Centralized debug logger so we can remove logs safely later.
  // Keep this side-effect minimal.
  const time = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[IB_NEXUS][${time}] ${label}`, payload ?? "");
}

