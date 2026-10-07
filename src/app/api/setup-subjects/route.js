import { bootstrapSubjectsDB } from "@/app/dashboard/subjects/actions";
import { requireAdmin } from "@/lib/auth/session";

export async function POST() {
  try {
    await requireAdmin();
    const result = await bootstrapSubjectsDB();
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}

export async function GET() {
  return Response.json({ error: "Method not allowed. Admin POST authentication required." }, { status: 405 });
}
