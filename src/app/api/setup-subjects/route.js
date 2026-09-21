import { bootstrapSubjectsDB } from "@/app/dashboard/subjects/actions";

export async function GET() {
  try {
    const result = await bootstrapSubjectsDB();
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message });
  }
}
