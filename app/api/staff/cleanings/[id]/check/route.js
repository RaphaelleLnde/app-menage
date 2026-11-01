import { db } from '@/lib/db';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  if (!isStaff(req)) return unauthorized();
  const { checkId, checked } = await req.json();
  const c = await db.getCleaning(params.id);
  if (!c || c.status !== 'in_progress') return json({ error: 'Ménage non commencé ou déjà terminé' }, 409);
  const k = await db.setCheck(params.id, checkId, !!checked);
  if (!k) return json({ error: 'Tâche introuvable' }, 404);
  return json(k);
}
