import { getMergedModelRegistry, resolveModelForUserAsync, getClientModelsWithHealth, isRoleAllowedForModel } from "../src/lib/ai/models.js";

async function verifyRegistryAndManagement() {
  console.log("=================================================");
  console.log("AUTHORITATIVE MODEL REGISTRY VERIFICATION");
  console.log("=================================================\n");

  // 1. Fetch merged registry
  const models = await getMergedModelRegistry();
  console.log(`Total Authoritative Models Found: ${models.length}`);

  let passModelsCount = models.length === 8;
  let passNoDuplicates = new Set(models.map(m => m.id)).size === models.length;
  let passNoProviderOnlyNames = models.every(m => m.displayName && !m.displayName.startsWith("(") && m.displayName !== m.provider);

  console.log("\nRegistered Models List:");
  console.table(
    models.map((m) => ({
      "Model ID": m.id,
      "Display Name": m.displayName,
      "Provider": m.provider,
      "Default": m.isDefault ? "YES" : "NO",
      "Enabled": m.enabled ? "YES" : "NO",
      "Paused": m.isPaused ? "YES" : "NO",
      "Hidden": m.isHidden ? "YES" : "NO",
      "Allowed Roles": m.allowedRoles,
    }))
  );

  // 2. Test RBAC logic
  console.log("\n--- Testing RBAC & Access Control Logic ---");
  const studentBlockedForAdminModel = !isRoleAllowedForModel("admin", "student");
  const adminAllowedForAdminModel = isRoleAllowedForModel("admin", "admin");
  const studentAllowedForPublicModel = isRoleAllowedForModel("all", "student");
  let passRbacEnforced = studentBlockedForAdminModel && adminAllowedForAdminModel && studentAllowedForPublicModel;

  console.log(`Student blocked for Admin-only model: ${studentBlockedForAdminModel ? "YES" : "NO"}`);
  console.log(`Admin allowed for Admin-only model: ${adminAllowedForAdminModel ? "YES" : "NO"}`);
  console.log(`Student allowed for Public model: ${studentAllowedForPublicModel ? "YES" : "NO"}`);

  // 3. Test Default Model Resolution
  const defaultResolved = await resolveModelForUserAsync(null, "student");
  console.log(`Default Model Resolved for Student: ${defaultResolved.displayName} (${defaultResolved.id})`);
  let passDefaultIsRealModel = !!defaultResolved && !!defaultResolved.id;

  // 4. Test Client Models with Health
  console.log("\n--- Testing Client Models Health/Availability ---");
  const clientModels = await getClientModelsWithHealth();
  console.log(`Client Eligible Models Count: ${clientModels.length}`);
  let passClientModels = clientModels.length > 0;

  console.log("\n=================================================");
  console.log("SUMMARY RESULTS:");
  console.log(`Model Count == 8: ${passModelsCount ? "PASS" : "FAIL"}`);
  console.log(`No Duplicates: ${passNoDuplicates ? "PASS" : "FAIL"}`);
  console.log(`No Provider-Only Names: ${passNoProviderOnlyNames ? "PASS" : "FAIL"}`);
  console.log(`Default Model Resolved: ${passDefaultIsRealModel ? "PASS" : "FAIL"}`);
  console.log(`Server-Side RBAC Enforced: ${passRbacEnforced ? "PASS" : "FAIL"}`);
  console.log(`Client Models Synchronization: ${passClientModels ? "PASS" : "FAIL"}`);
  console.log("=================================================");
}

verifyRegistryAndManagement().catch(console.error);
