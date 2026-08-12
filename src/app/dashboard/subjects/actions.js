"use server";

import { createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "../community/actions";

export async function fetchGlobalSubjects() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("ib_subjects").select("*").order("category").order("name");
  if (error) {
    if (error.code === "42P01") return []; // Table doesn't exist yet
    console.error("Error fetching global subjects:", error);
    return [];
  }
  return data || [];
}

export async function addGlobalSubjectAction(program, category, name) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");
  const supabase = createAdminClient();
  const { error } = await supabase.from("ib_subjects").insert({ program, category, name });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function editGlobalSubjectAction(id, program, category, name) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");
  const supabase = createAdminClient();
  const { error } = await supabase.from("ib_subjects").update({ program, category, name }).eq("id", id);
  if (error) throw new Error(error.message);
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE (program, category, name)
    );
    
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
  
  await supabase.rpc("exec_sql", { sql: createTableSQL });
  
  const DP_SUBJECTS = [
    { category: "Group 1 & 2: Languages", subjects: ["English A Lit", "English A Lang & Lit", "Spanish B", "French B", "Mandarin B", "German B", "German ab initio"] },
    { category: "Group 3: Individuals & Societies", subjects: ["History", "Geography", "Economics", "Business Management", "Psychology", "Global Politics"] },
    { category: "Group 4: Sciences", subjects: ["Biology", "Chemistry", "Physics", "Computer Science", "ESS"] },
    { category: "Group 5: Mathematics", subjects: ["Mathematics AA", "Mathematics AI"] }
  ];

  const MYP_SUBJECTS = [
    { category: "Language and Literature", subjects: ["English Lang & Lit", "Spanish Lang & Lit", "German Lang & Lit"] },
    { category: "Language Acquisition", subjects: ["French", "Spanish", "Mandarin", "German"] },
    { category: "Individuals and Societies", subjects: ["History", "Geography", "Integrated Humanities"] },
    { category: "Sciences", subjects: ["Biology", "Chemistry", "Physics", "Integrated Sciences"] },
    { category: "Mathematics", subjects: ["Mathematics (Standard)", "Mathematics (Extended)"] },
    { category: "Arts", subjects: ["Visual Arts", "Music", "Drama"] },
    { category: "Design", subjects: ["Design"] },
    { category: "Physical and Health Education", subjects: ["PHE"] }
  ];
  
  const toInsert = [];
  DP_SUBJECTS.forEach(g => {
    g.subjects.forEach(s => {
      toInsert.push({ program: "dp", category: g.category, name: s });
    });
  });
  MYP_SUBJECTS.forEach(g => {
    g.subjects.forEach(s => {
      toInsert.push({ program: "myp", category: g.category, name: s });
    });
  });
  
  const { error: insertError } = await supabase
    .from("ib_subjects")
    .upsert(toInsert, { onConflict: "program,category,name", ignoreDuplicates: true });
    
  if (insertError) {
    return { success: false, error: insertError.message };
  }
  
  return { success: true };
}

export async function updateSubjectsAction(subjects) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({ subjects })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update subjects:", error);
    throw new Error("Failed to update subjects");
  }

  revalidatePath("/", "layout");
  return { success: true };
}
