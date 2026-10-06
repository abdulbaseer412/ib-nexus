import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const supabase = await createServerClient();

  // Get all platform and approved community resources to build stats
  const { data, error } = await supabase
    .from("ib_resources")
    .select("subject, resource_type, source, user_id, visibility")
    .or(`source.eq.platform,and(source.eq.user,visibility.in.(approved,public)),user_id.eq."${user.id}"`);

  if (error) {
    console.error("Resources stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate subject stats
  const subjectStats = {};
  
  for (const r of data) {
    if (!r.subject) continue;
    if (!subjectStats[r.subject]) {
      subjectStats[r.subject] = {
        count: 0,
        types: new Set()
      };
    }
    subjectStats[r.subject].count++;
    if (r.resource_type) {
      subjectStats[r.subject].types.add(r.resource_type);
    }
  }

  const result = Object.keys(subjectStats).reduce((acc, subject) => {
    acc[subject] = {
      count: subjectStats[subject].count,
      types: Array.from(subjectStats[subject].types)
    };
    return acc;
  }, {});

  return NextResponse.json(result);
}
