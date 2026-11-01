import { db } from '@/lib/db';
import { getChecklist } from '@/lib/checklist';
import { isHost, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isHost(req)) return unauthorized();
  return json(await getChecklist());
}

// Remplace la checklist. Les ménages déjà commencés gardent leur copie.
export async function PUT(req) {
  if (!isHost(req)) return unauthorized();
  const { items } = await req.json();
  if (!Array.isArray(items)) return json({ error: 'Liste invalide' }, 400);
  const cleanItems = items
    .map((it) => ({ room: String(it.room || '').trim().slice(0, 60), label: String(it.label || '').trim().slice(0, 200), photo_required: !!it.photo_required, required: it.required !== false }))
    .filter((it) => it.room && it.label)
    .map((it, position) => ({ ...it, position }));
  if (!cleanItems.length) return json({ error: 'La checklist ne peut pas être vide' }, 400);
  await db.replaceChecklistItems(cleanItems);
  return json(await db.listChecklistItems());
}
