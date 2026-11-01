import { removeName } from '@/lib/staff';
import { isHost, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function DELETE(req) {
  if (!isHost(req)) return unauthorized();
  const { name } = await req.json();
  return json(await removeName(name));
}
