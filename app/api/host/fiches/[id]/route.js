import { db } from '@/lib/db';
import { isHost, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  if (!isHost(req)) return unauthorized();
  const f = await db.getGuestForm(params.id);
  if (!f) return json({ error: 'Fiche introuvable' }, 404);
  return json(f);
}

export async function DELETE(req, { params }) {
  if (!isHost(req)) return unauthorized();
  await db.deleteGuestForm(params.id);
  return json({ ok: true });
}
