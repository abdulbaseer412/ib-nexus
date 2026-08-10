import { testDb } from '../dashboard/test_action';

export default async function TestPage() {
  const result = await testDb();
  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
