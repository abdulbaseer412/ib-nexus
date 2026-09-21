const fs = require('fs');
const path = require('path');

const actionsPath = path.join(__dirname, 'src/app/dashboard/admin/actions.js');
const clientPath = path.join(__dirname, 'src/app/dashboard/admin/AdminClient.js');
const pagePath = path.join(__dirname, 'src/app/dashboard/admin/page.js');

const actionsContent = fs.readFileSync(actionsPath, 'utf8');
const clientContent = fs.readFileSync(clientPath, 'utf8');
const pageContent = fs.readFileSync(pagePath, 'utf8');

// Find exports in actions.js
const exportedFuncs = [];
const exportMatches = actionsContent.matchAll(/export\s+(async\s+)?function\s+([a-zA-Z0-9_]+)/g);
for (const match of exportMatches) {
  exportedFuncs.push(match[2]);
}

console.log("=== EXPORTED ACTIONS IN actions.js (" + exportedFuncs.length + ") ===");
console.log(exportedFuncs.sort());

// Find imports from ./actions in AdminClient.js
const clientImportMatch = clientContent.match(/import\s*\{([\s\S]*?)\}\s*from\s*["']\.\/actions["']/);
const clientImports = clientImportMatch ? clientImportMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

console.log("\n=== IMPORTS IN AdminClient.js (" + clientImports.length + ") ===");
console.log(clientImports.sort());

// Find imports from ./actions in page.js
const pageImportMatch = pageContent.match(/import\s*\{([\s\S]*?)\}\s*from\s*["']\.\/actions["']/);
const pageImports = pageImportMatch ? pageImportMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

console.log("\n=== IMPORTS IN page.js (" + pageImports.length + ") ===");
console.log(pageImports.sort());

// Check for missing exports in client imports
const missingInActions = clientImports.filter(imp => !exportedFuncs.includes(imp));
console.log("\n=== IMPORTS IN CLIENT NOT IN ACTIONS.JS ===");
console.log(missingInActions);

// Find all usages of *Action or *Func or handle* in AdminClient.js
const actionUsagesInClient = new Set();
const usagesMatches = clientContent.matchAll(/([a-zA-Z0-9_]+Action)\b/g);
for (const m of usagesMatches) {
  actionUsagesInClient.add(m[1]);
}
console.log("\n=== ALL *Action IDENTIFIERS USED IN AdminClient.js (" + actionUsagesInClient.size + ") ===");
console.log(Array.from(actionUsagesInClient).sort());

const unimportedActions = Array.from(actionUsagesInClient).filter(act => !clientImports.includes(act));
console.log("\n=== *Action IDENTIFIERS USED BUT NOT IMPORTED IN AdminClient.js ===");
console.log(unimportedActions);
