import { testDb } from '../dashboard/test_action';
import { requireAdmin } from '@/lib/auth/session';

export default async function TestPage() {
  await requireAdmin();
  const result = await testDb();
  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
