import { setKeybox } from '@/lib/property';
import { isHost, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function PUT(req) {
  if (!isHost(req)) return unauthorized();
  const { code } = await req.json();
  if (!code || !String(code).trim()) return json({ error: 'Code vide' }, 400);
  return json(await setKeybox(code));
}
