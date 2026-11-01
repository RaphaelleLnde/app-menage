import { db } from '@/lib/db';
import { withPhotoUrls } from '@/lib/api';
import { isHost, isViewer, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  if (!isViewer(req)) return unauthorized();
  const c = await db.getCleaning(params.id);
  if (!c) return json({ error: 'Ménage introuvable' }, 404);
  return json(await withPhotoUrls(c));
}

// Annuler, réactiver ou déplacer un ménage
export async function PATCH(req, { params }) {
  if (!isHost(req)) return unauthorized();
  const body = await req.json();
  const c = await db.getCleaning(params.id);
  if (!c) return json({ error: 'Ménage introuvable' }, 404);
  const patch = {};
  if (body.status === 'cancelled' && c.status === 'planned') patch.status = 'cancelled';
  if (body.status === 'planned' && c.status === 'cancelled') patch.status = 'planned';
  if (body.status === 'in_progress' && c.status === 'done') { patch.status = 'in_progress'; patch.completed_at = null; patch.has_remarks = false; patch.remarks_seen = false; }
  if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) && c.status !== 'done') patch.date = body.date;
  if (body.remarks_seen === true) patch.remarks_seen = true;
  if ('guest_name' in body) patch.guest_name = String(body.guest_name || '').trim().slice(0, 80) || null;
  if ('host_note' in body) patch.host_note = body.host_note ? String(body.host_note).trim().slice(0, 2000) || null : null;
  if ('extra_tasks' in body) {
    if (c.status !== 'planned') return json({ error: 'Le ménage a déjà commencé : les points de checklist ne peuvent plus être ajoutés.' }, 409);
    patch.extra_tasks = (Array.isArray(body.extra_tasks) ? body.extra_tasks : [])
      .map((t) => ({ label: String(t.label || '').trim().slice(0, 200), photo_required: !!t.photo_required }))
      .filter((t) => t.label).slice(0, 20);
  }
  if (!Object.keys(patch).length) return json({ error: 'Modification impossible' }, 409);
  return json(await db.updateCleaning(c.id, patch));
}
