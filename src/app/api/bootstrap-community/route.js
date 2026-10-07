import { bootstrapCommunityDB, getBootstrapSQL } from "@/app/dashboard/community/actions";
import { requireAdmin } from "@/lib/auth/session";

export async function POST() {
  try {
    await requireAdmin();
    const result = await bootstrapCommunityDB();
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message, sql: getBootstrapSQL() }, { status: 403 });
  }
}

export async function GET() {
  return Response.json({ error: "Method not allowed. Admin POST authentication required." }, { status: 405 });
}
