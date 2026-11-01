import { getNames, addName, removeName } from '@/lib/staff';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isStaff(req)) return unauthorized();
  return json(await getNames());
}

export async function POST(req) {
  if (!isStaff(req)) return unauthorized();
  const { name } = await req.json();
  return json(await addName(name));
}

export async function DELETE(req) {
  if (!isStaff(req)) return unauthorized();
  const { name } = await req.json();
  return json(await removeName(name));
}
