import { db } from '@/lib/db';
import { withPhotoUrls } from '@/lib/api';
import { isHost, isViewer, getRole, unauthorized, json } from '@/lib/util';
import { isTime, fmtHour } from '@/lib/horaires';
import { notifyHost } from '@/lib/push';
import { waitUntil } from '@vercel/functions';

// La conciergerie ne voit pas les notes privées de l'hôte ni les infos de réservation
function forRole(req, c) {
  if (getRole(req) !== 'concierge') return c;
  const { host_memo, resa_code, guest_phone4, ...rest } = c;
  return rest;
}
const longDay = (iso) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso + 'T00:00:00Z'));

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  if (!isViewer(req)) return unauthorized();
  const c = await db.getCleaning(params.id);
  if (!c) return json({ error: 'Ménage introuvable' }, 404);
  return json(forRole(req, await withPhotoUrls(c)));
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
  if ('host_memo' in body) patch.host_memo = String(body.host_memo || '').trim().slice(0, 3000) || null;
  // Départ tardif / arrivée anticipée, notés sur la réservation
  for (const f of ['checkout_time', 'checkin_time']) {
    if (f in body) {
      if (body[f] && !isTime(body[f])) return json({ error: 'Heure invalide' }, 400);
      patch[f] = body[f] || null;
    }
  }
  if ('guest_name' in body) patch.guest_name = String(body.guest_name || '').trim().slice(0, 80) || null;
  if ('host_note' in body) patch.host_note = body.host_note ? String(body.host_note).trim().slice(0, 2000) || null : null;
  if ('extra_tasks' in body) {
    if (c.status !== 'planned') return json({ error: 'Le ménage a déjà commencé : les points de checklist ne peuvent plus être ajoutés.' }, 409);
    patch.extra_tasks = (Array.isArray(body.extra_tasks) ? body.extra_tasks : [])
      .map((t) => ({ label: String(t.label || '').trim().slice(0, 200), photo_required: !!t.photo_required }))
      .filter((t) => t.label).slice(0, 20);
  }
  if (!Object.keys(patch).length) return json({ error: 'Modification impossible' }, 409);
  const saved = await db.updateCleaning(c.id, patch);
  // « Prévenir la conciergerie » : notification envoyée seulement aux appareils de la conciergerie
  if (body.notify_concierge && ('checkout_time' in patch || 'checkin_time' in patch)) {
    const lines = [];
    if ('checkout_time' in patch && patch.checkout_time !== c.checkout_time) {
      lines.push(patch.checkout_time ? `Départ tardif à ${fmtHour(patch.checkout_time)} le ${longDay(c.date)} : le ménage commencera après.` : `Départ tardif annulé le ${longDay(c.date)}.`);
    }
    if ('checkin_time' in patch && patch.checkin_time !== c.checkin_time && c.checkin_date) {
      lines.push(patch.checkin_time ? `Arrivée anticipée à ${fmtHour(patch.checkin_time)} le ${longDay(c.checkin_date)} : le ménage doit être fini avant.` : `Arrivée anticipée annulée le ${longDay(c.checkin_date)}.`);
    }
    if (lines.length) {
      waitUntil(notifyHost({ title: 'Horaires des voyageurs modifiés', body: lines.join(' '), url: '/admin/calendrier', to: ['concierge'] }).catch((e) => console.error(e)));
    }
    return json({ ...saved, notified: lines.length > 0 });
  }
  return json(saved);
}
