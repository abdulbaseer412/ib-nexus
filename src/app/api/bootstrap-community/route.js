import { bootstrapCommunityDB, getBootstrapSQL } from "@/app/dashboard/community/actions";

export async function GET() {
  try {
    const result = await bootstrapCommunityDB();
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message, sql: getBootstrapSQL() });
  }
}
