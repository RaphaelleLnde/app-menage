import { db } from '@/lib/db';
import { missingForCompletion } from '@/lib/api';
import { notifyHost } from '@/lib/push';
import { waitUntil } from '@vercel/functions';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  if (!isStaff(req)) return unauthorized();
  const { name, notes } = await req.json();
  const c = await db.getCleaning(params.id);
  if (!c || c.status !== 'in_progress') return json({ error: 'Ménage non commencé ou déjà terminé' }, 409);
  const missing = missingForCompletion(c);
  if (missing.length) return json({ error: 'Checklist incomplète', missing }, 422);
  const who = String(name || c.cleaner_name || '').trim().slice(0, 40);
  const note = notes ? String(notes).trim().slice(0, 2000) : '';
  const otherPhotos = c.photos.filter((p) => !p.check_id).length;
  const hasRemarks = !!note || otherPhotos > 0;
  const done = await db.updateCleaning(c.id, {
    status: 'done', completed_at: new Date().toISOString(), completed_by: who, notes: note || null,
    has_remarks: hasRemarks, remarks_seen: false,
  });
  const mins = Math.round((new Date(done.completed_at) - new Date(c.started_at)) / 60000);
  const duree = `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')}`;
  // Deux notifications différentes : ménage terminé, ou ménage terminé avec des remarques à vérifier
  const remarks = [note && `« ${note.slice(0, 120)}${note.length > 120 ? '…' : ''} »`, otherPhotos && `${otherPhotos} photo${otherPhotos > 1 ? 's' : ''} de problème`].filter(Boolean).join(' · ');
  // La notification part en arrière-plan : la personne n'attend pas l'envoi
  waitUntil(notifyHost(hasRemarks ? {
    title: 'Remarques à vérifier · ménage terminé',
    body: `${who} a terminé (${duree}). ${remarks}`,
    url: `/admin/c/${c.id}`,
  } : {
    title: 'Ménage terminé',
    body: `${who} a terminé le ménage (${duree}, ${c.photos.length} photo${c.photos.length > 1 ? 's' : ''}).`,
    url: `/admin/c/${c.id}`,
  }).catch((e) => console.error(e)));
  return json({ ok: true, completed_at: done.completed_at, completed_by: who });
}
