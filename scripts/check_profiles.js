const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
);

async function testOnboardingUpsert() {
  console.log("=== TESTING ONBOARDING UPSERT PAYLOAD WITH REAL SUPABASE DB ===");
  const { data: sample } = await supabase.from('profiles').select('id, email, display_name').limit(1);
  if (!sample || sample.length === 0) {
    console.error("No sample user found in DB to test upsert.");
    return;
  }
  const testUser = sample[0];
  console.log("Testing with existing profile ID:", testUser.id);

  // Test MYP payload
  const mypPayload = {
    id: testUser.id,
    display_name: testUser.display_name || "Abdul Baseer",
    full_name: testUser.display_name || "Abdul Baseer",
    email: testUser.email,
    ib_program: "myp",
    subjects: [
      { name: "English Language & Literature", category: "Language and Literature", level: null },
      { name: "Biology", category: "Sciences", level: null },
      { name: "Mathematics (Extended)", category: "Mathematics", level: null },
      { name: "History", category: "Individuals and Societies", level: null },
      { name: "Visual Arts", category: "Arts", level: null },
      { name: "Design", category: "Design", level: null }
    ],
    study_goals: ["Past paper practice", "Conceptual understanding"],
    exam_session: "May 2027",
    school_name: "Test IB World School",
    referral_source: "Search Engine",
    avatar_url: "fox",
    onboarding_completed: true
  };

  console.log("\nAttempting MYP profile upsert...");
  const { data: dMYP, error: eMYP } = await supabase
    .from('profiles')
    .upsert(mypPayload, { onConflict: 'id' })
    .select('id, onboarding_completed, ib_program, subjects')
    .single();

  if (eMYP) {
    console.error("❌ MYP Upsert failed:", eMYP);
  } else {
    console.log("✅ MYP Upsert SUCCESS:", dMYP);
  }

  // Test DP payload
  const dpPayload = {
    id: testUser.id,
    display_name: testUser.display_name || "Abdul Baseer",
    full_name: testUser.display_name || "Abdul Baseer",
    email: testUser.email,
    ib_program: "dp",
    subjects: [
      { name: "Language A: Literature", category: "Group 1: Studies in Language & Literature", level: "HL" },
      { name: "English B", category: "Group 2: Language Acquisition", level: "SL" },
      { name: "Economics", category: "Group 3: Individuals & Societies", level: "HL" },
      { name: "Biology", category: "Group 4: Sciences", level: "HL" },
      { name: "Mathematics: Analysis & Approaches (AA)", category: "Group 5: Mathematics", level: "SL" },
      { name: "Visual Arts", category: "Group 6: The Arts", level: "SL" },
      { name: "Theory of Knowledge (TOK)", category: "DP Core", level: null, is_core: true },
      { name: "Extended Essay (EE)", category: "DP Core", level: null, is_core: true },
      { name: "Creativity, Activity, Service (CAS)", category: "DP Core", level: null, is_core: true }
    ],
    study_goals: ["Past paper practice", "Exam technique"],
    exam_session: "May 2027",
    school_name: "Test IB World School",
    referral_source: "Search Engine",
    avatar_url: "fox",
    onboarding_completed: true
  };

  console.log("\nAttempting DP profile upsert...");
  const { data: dDP, error: eDP } = await supabase
    .from('profiles')
    .upsert(dpPayload, { onConflict: 'id' })
    .select('id, onboarding_completed, ib_program, subjects')
    .single();

  if (eDP) {
    console.error("❌ DP Upsert failed:", eDP);
  } else {
    console.log("✅ DP Upsert SUCCESS:", dDP);
  }
}

testOnboardingUpsert();
