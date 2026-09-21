const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("=== CHECKING ADMIN ACTIVITY LOGS TABLES ===");
  
  const { data: adminLogs, error: adminErr } = await supabase
    .from("admin_activity_logs")
    .select("*")
    .limit(5);
  console.log("admin_activity_logs:", adminLogs, adminErr);

  const { data: auditLogs, error: auditErr } = await supabase
    .from("audit_logs")
    .select("*")
    .limit(5);
  console.log("audit_logs:", auditLogs, auditErr);
}

main().catch(console.error);
