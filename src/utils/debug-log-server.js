export function debugLogServer(label, payload) {
  const time = new Date().toISOString();
   
  console.log(`[IB_NEXUS][${time}] ${label}`, payload ?? "");
}

