const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    envVars[match[1]] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const COMMUNITY_CATEGORIES = [
  "Biology", "Chemistry", "Physics", "Mathematics", "Computer Science",
  "Economics", "Business Management", "History", "Geography",
  "English", "Languages", "TOK", "Extended Essay", "Internal Assessment",
  "Study Tips", "Exam Preparation", "General IB"
];

async function seedSubjects() {
  console.log("Seeding default IB subjects into community_subjects...");

  for (const name of COMMUNITY_CATEGORIES) {
    const { error } = await supabase
      .from('community_subjects')
      .upsert({ name }, { onConflict: 'name' });

    if (error) {
      console.log(`Note for ${name}:`, error.message);
    } else {
      console.log(`Subject ${name} ready.`);
    }
  }

  console.log("Seeding completed successfully.");
}

seedSubjects();
