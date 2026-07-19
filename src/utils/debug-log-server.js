export function debugLogServer(label, payload) {
  const time = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[IB_NEXUS][${time}] ${label}`, payload ?? "");
}

