const { createAdminClient } = require("../src/lib/supabase/server");

async function checkTables() {
  const admin = createAdminClient();
  console.log("Checking database tables...");

  const { data: logs, error: logsErr } = await admin.from("admin_activity_logs").select("id").limit(1);
  console.log("admin_activity_logs check:", logsErr ? logsErr.message : "EXISTS (" + (logs ? logs.length : 0) + " rows)");

  const { data: configs, error: cfgErr } = await admin.from("ai_model_configs").select("*").limit(10);
  console.log("ai_model_configs check:", cfgErr ? cfgErr.message : "EXISTS (" + (configs ? configs.length : 0) + " rows)");
}

checkTables().catch(console.error);
