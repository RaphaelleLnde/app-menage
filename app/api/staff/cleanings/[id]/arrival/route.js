import { db } from '@/lib/db';
import { ARRIVAL_AREAS, ARRIVAL_STATES, BAD_STATES, stateLabel } from '@/lib/arrival';
import { notifyHost } from '@/lib/push';
import { waitUntil } from '@vercel/functions';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Validation de l'état des lieux d'arrivée : état du logement, photos de chaque pièce, commentaire.
export async function POST(req, { params }) {
  if (!isStaff(req)) return unauthorized();
  const { state, note } = await req.json();
  if (!ARRIVAL_STATES.some((s) => s.key === state)) return json({ error: "Choisis l'état du logement" }, 400);
  const c = await db.getCleaning(params.id);
  if (!c || c.status !== 'in_progress') return json({ error: 'Ménage non commencé ou déjà terminé' }, 409);
  const missingAreas = ARRIVAL_AREAS.filter((a) => !c.photos.some((p) => p.phase === 'arrivee' && p.area === a.key));
  if (missingAreas.length) return json({ error: `Photo manquante : ${missingAreas.map((a) => a.label).join(', ')}` }, 422);
  const n = note ? String(note).trim().slice(0, 2000) : '';
  await db.updateCleaning(c.id, { arrival_state: state, arrival_note: n || null, arrival_done_at: new Date().toISOString() });
  // Logement rendu sale ou problème signalé : l'hôte est prévenue tout de suite (utile pour une réclamation)
  if (BAD_STATES.includes(state) || n) {
    waitUntil(notifyHost({
      title: `État du logement à l'arrivée : ${stateLabel(state)}`,
      body: `${c.cleaner_name || 'Le personnel'} : ${n ? '« ' + n.slice(0, 140) + ' »' : 'voir les photos.'}`,
      url: `/admin/c/${c.id}`,
    }).catch((e) => console.error(e)));
  }
  return json({ ok: true, arrival_state: state, arrival_note: n || null });
}
