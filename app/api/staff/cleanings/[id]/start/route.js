import { db } from '@/lib/db';
import { getChecklist } from '@/lib/checklist';
import { addName } from '@/lib/staff';
import { withPhotoUrls } from '@/lib/api';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Démarre le ménage : on fige une copie de la checklist du moment pour garder un historique fiable.
export async function POST(req, { params }) {
  if (!isStaff(req)) return unauthorized();
  const { name } = await req.json();
  if (!name || !String(name).trim()) return json({ error: 'Prénom manquant' }, 400);
  const c = await db.getCleaning(params.id);
  if (!c) return json({ error: 'Ménage introuvable' }, 404);
  if (c.status === 'planned') {
    const items = await getChecklist();
    if (!c.checks.length) {
      // Les points ajoutés par l'hôte pour ce ménage passent en premier
      const extras = (c.extra_tasks || []).map((t) => ({ room: "Consignes de l'hôte", label: t.label, photo_required: !!t.photo_required }));
      await db.insertChecks([...extras, ...items].map((it, i) => ({
        cleaning_id: c.id, room: it.room, label: it.label, photo_required: !!it.photo_required, position: i,
      })));
    }
    await db.updateCleaning(c.id, { status: 'in_progress', cleaner_name: String(name).trim().slice(0, 40), started_at: new Date().toISOString() });
  } else if (c.status !== 'in_progress') {
    return json({ error: 'Ce ménage ne peut pas être commencé' }, 409);
  }
  await addName(name);
  return json(await withPhotoUrls(await db.getCleaning(c.id)));
}
