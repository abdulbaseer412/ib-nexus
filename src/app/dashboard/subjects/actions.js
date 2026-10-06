"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "../community/actions";

export async function fetchGlobalSubjects() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ib_subjects")
    .select("*")
    .order("program")
    .order("category")
    .order("name");
  
  if (error) {
    if (error.code === "42P01") return []; // Table doesn't exist yet
    console.error("Error fetching global subjects:", error);
    return [];
  }
  return data || [];
}

export async function addGlobalSubjectAction(program, category, name, available_levels = null) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");
  const supabase = createAdminClient();
  let res = await supabase.from("ib_subjects").insert({ program, category, name, available_levels });
  
  if (res.error && res.error.message.includes("available_levels")) {
    res = await supabase.from("ib_subjects").insert({ program, category, name });
  }
  
  if (res.error) throw new Error(res.error.message);
  revalidatePath("/", "layout");
}

export async function editGlobalSubjectAction(id, program, category, name, available_levels = null) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");
  const supabase = createAdminClient();
  let res = await supabase.from("ib_subjects").update({ program, category, name, available_levels }).eq("id", id);
  
  if (res.error && res.error.message.includes("available_levels")) {
    res = await supabase.from("ib_subjects").update({ program, category, name }).eq("id", id);
  }
  
  if (res.error) throw new Error(res.error.message);
  revalidatePath("/", "layout");
}

export async function deleteGlobalSubjectAction(id) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");
  const supabase = createAdminClient();
  const { error } = await supabase.from("ib_subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function bootstrapSubjectsDB() {
  const supabase = createAdminClient();
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.ib_subjects (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      program TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      available_levels JSONB DEFAULT NULL,
      selection_mode TEXT DEFAULT 'single',
      min_selections INTEGER DEFAULT 0,
      max_selections INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE (program, category, name)
    );

    ALTER TABLE public.ib_subjects ADD COLUMN IF NOT EXISTS available_levels JSONB DEFAULT NULL;
    ALTER TABLE public.ib_subjects ADD COLUMN IF NOT EXISTS selection_mode TEXT DEFAULT 'single';
    ALTER TABLE public.ib_subjects ADD COLUMN IF NOT EXISTS min_selections INTEGER DEFAULT 0;
    ALTER TABLE public.ib_subjects ADD COLUMN IF NOT EXISTS max_selections INTEGER DEFAULT 1;
    ALTER TABLE public.ib_subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

    ALTER TABLE public.ib_subjects ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view ib_subjects' AND tablename = 'ib_subjects'
      ) THEN
        CREATE POLICY "Anyone can view ib_subjects" ON public.ib_subjects FOR SELECT USING (true);
      END IF;
    END
    $$;
  `;
  
  try {
    await supabase.rpc("exec_sql", { sql: createTableSQL });
  } catch (err) {
    console.warn("Bootstrap RPC exec_sql warning:", err?.message);
  }
  
  // Official DP 2 Course Catalog
  const DP_SUBJECT_GROUPS = [
    {
      category: "Group 1: Studies in Language & Literature",
      courses: [
        { name: "Language A: Literature", levels: ["SL", "HL"] },
        { name: "Language A: Language & Literature", levels: ["SL", "HL"] },
        { name: "Literature & Performance", levels: ["SL"] }
      ]
    },
    {
      category: "Group 2: Language Acquisition",
      courses: [
        { name: "English B", levels: ["SL", "HL"] },
        { name: "Spanish B", levels: ["SL", "HL"] },
        { name: "French B", levels: ["SL", "HL"] },
        { name: "German B", levels: ["SL", "HL"] },
        { name: "Mandarin B", levels: ["SL", "HL"] },
        { name: "Spanish ab initio", levels: ["SL"] },
        { name: "French ab initio", levels: ["SL"] },
        { name: "German ab initio", levels: ["SL"] },
        { name: "Mandarin ab initio", levels: ["SL"] },
        { name: "Classical Languages (Latin/Greek)", levels: ["SL", "HL"] }
      ]
    },
    {
      category: "Group 3: Individuals & Societies",
      courses: [
        { name: "Business Management", levels: ["SL", "HL"] },
        { name: "Digital Society", levels: ["SL", "HL"] },
        { name: "Economics", levels: ["SL", "HL"] },
        { name: "Geography", levels: ["SL", "HL"] },
        { name: "Global Politics", levels: ["SL", "HL"] },
        { name: "History", levels: ["SL", "HL"] },
        { name: "Philosophy", levels: ["SL", "HL"] },
        { name: "Psychology", levels: ["SL", "HL"] },
        { name: "Social & Cultural Anthropology", levels: ["SL", "HL"] },
        { name: "World Religions", levels: ["SL"] }
      ]
    },
    {
      category: "Group 4: Sciences",
      courses: [
        { name: "Biology", levels: ["SL", "HL"] },
        { name: "Chemistry", levels: ["SL", "HL"] },
        { name: "Computer Science", levels: ["SL", "HL"] },
        { name: "Design Technology", levels: ["SL", "HL"] },
        { name: "Environmental Systems & Societies (ESS)", levels: ["SL", "HL"] },
        { name: "Physics", levels: ["SL", "HL"] },
        { name: "Sports, Exercise & Health Science", levels: ["SL", "HL"] }
      ]
    },
    {
      category: "Group 5: Mathematics",
      courses: [
        { name: "Mathematics: Analysis & Approaches (AA)", levels: ["SL", "HL"] },
        { name: "Mathematics: Applications & Interpretation (AI)", levels: ["SL", "HL"] }
      ]
    },
    {
      category: "Group 6: The Arts",
      courses: [
        { name: "Visual Arts", levels: ["SL", "HL"] },
        { name: "Music", levels: ["SL", "HL"] },
        { name: "Theatre", levels: ["SL", "HL"] },
        { name: "Film", levels: ["SL", "HL"] },
        { name: "Dance", levels: ["SL", "HL"] }
      ]
    },
    {
      category: "DP Core",
      courses: [
        { name: "Theory of Knowledge (TOK)", levels: null },
        { name: "Extended Essay (EE)", levels: null },
        { name: "Creativity, Activity, Service (CAS)", levels: null }
      ]
    }
  ];

  // Official MYP 5 Course Catalog (8 Subject Groups with configurable modes)
  const MYP_SUBJECT_GROUPS = [
    {
      category: "Language and Literature",
      selection_mode: "single",
      max_selections: 1,
      courses: [
        { name: "English Language & Literature", levels: null },
        { name: "Spanish Language & Literature", levels: null },
        { name: "German Language & Literature", levels: null },
        { name: "French Language & Literature", levels: null }
      ]
    },
    {
      category: "Language Acquisition",
      selection_mode: "single",
      max_selections: 1,
      courses: [
        { name: "English Language Acquisition", levels: null },
        { name: "Spanish Language Acquisition", levels: null },
        { name: "French Language Acquisition", levels: null },
        { name: "German Language Acquisition", levels: null },
        { name: "Mandarin Language Acquisition", levels: null }
      ]
    },
    {
      category: "Individuals and Societies",
      selection_mode: "single",
      max_selections: 1,
      courses: [
        { name: "History", levels: null },
        { name: "Geography", levels: null },
        { name: "Economics", levels: null },
        { name: "Global Politics", levels: null },
        { name: "Integrated Humanities", levels: null }
      ]
    },
    {
      category: "Sciences",
      selection_mode: "multiple",
      max_selections: 2,
      courses: [
        { name: "Biology", levels: null },
        { name: "Chemistry", levels: null },
        { name: "Physics", levels: null },
        { name: "Integrated Sciences", levels: null },
        { name: "Environmental Sciences", levels: null }
      ]
    },
    {
      category: "Mathematics",
      selection_mode: "single",
      max_selections: 1,
      courses: [
        { name: "Mathematics (Standard)", levels: null },
        { name: "Mathematics (Extended)", levels: null }
      ]
    },
    {
      category: "Arts",
      selection_mode: "single",
      max_selections: 1,
      courses: [
        { name: "Visual Arts", levels: null },
        { name: "Music", levels: null },
        { name: "Drama/Theatre", levels: null }
      ]
    },
    {
      category: "Physical and Health Education",
      selection_mode: "single",
      max_selections: 1,
      courses: [
        { name: "Physical and Health Education (PHE)", levels: null }
      ]
    },
    {
      category: "Design",
      selection_mode: "single",
      max_selections: 1,
      courses: [
        { name: "Design", levels: null }
      ]
    }
  ];

  const toInsert = [];
  DP_SUBJECT_GROUPS.forEach(g => {
    g.courses.forEach(c => {
      toInsert.push({
        program: "dp",
        category: g.category,
        name: c.name,
        available_levels: c.levels ? JSON.stringify(c.levels) : null,
        selection_mode: "single",
        min_selections: 0,
        max_selections: 1,
        is_active: true
      });
    });
  });

  MYP_SUBJECT_GROUPS.forEach(g => {
    g.courses.forEach(c => {
      toInsert.push({
        program: "myp",
        category: g.category,
        name: c.name,
        available_levels: null,
        selection_mode: g.selection_mode,
        min_selections: 0,
        max_selections: g.max_selections,
        is_active: true
      });
    });
  });

  const { error: insertError } = await supabase
    .from("ib_subjects")
    .upsert(toInsert, { onConflict: "program,category,name", ignoreDuplicates: true });

  if (insertError) {
    console.error("[bootstrapSubjectsDB] Error seeding subjects:", insertError);
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

export async function updateSubjectsAction(subjects, program = "dp") {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const cleanProgram = program?.toLowerCase()?.includes("myp") ? "myp" : "dp";
  const cleanSubjects = Array.isArray(subjects) ? subjects : [];

  const { error } = await supabase
    .from("profiles")
    .update({ 
      subjects: cleanSubjects,
      ib_program: cleanProgram
    })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update subjects:", error);
    throw new Error("Failed to update subjects: " + error.message);
  }

  try {
    revalidatePath("/dashboard/subjects");
    revalidatePath("/settings/profile");
    revalidatePath("/dashboard/resources");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
  } catch (_) {}

  return { success: true };
}

