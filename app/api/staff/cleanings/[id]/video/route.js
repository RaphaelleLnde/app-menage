import crypto from 'crypto';
import { db } from '@/lib/db';
import { VIDEO_MAX_BYTES, VIDEO_PHASES, VIDEO_TYPES } from '@/lib/media';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Étape 1 : le téléphone demande une adresse d'envoi. La vidéo part ensuite directement
// vers le stockage (trop lourde pour passer par le serveur de l'application).
// Étape 2 (action = 'done') : le téléphone confirme l'envoi, on enregistre la vidéo avec l'heure du serveur.
export async function POST(req, { params }) {
  if (!isStaff(req)) return unauthorized();
  const c = await db.getCleaningLite(params.id);
  if (!c || c.status !== 'in_progress') return json({ error: 'Ménage non commencé ou déjà terminé' }, 409);
  const body = await req.json();
  const phase = VIDEO_PHASES.includes(body.phase) ? body.phase : null;
  if (!phase) return json({ error: 'Moment de la vidéo manquant' }, 400);

  if (body.action === 'done') {
    const path = String(body.path || '');
    if (!path.startsWith(`${c.id}/video-${phase}-`) || !(await db.fileExists(path))) return json({ error: "La vidéo n'est pas arrivée, réessaie." }, 409);
    const row = await db.insertPhoto({
      cleaning_id: c.id, kind: 'video', phase, check_id: null, area: null,
      storage_path: path, sha256: null, content_type: String(body.type || '').slice(0, 40) || null,
      size_bytes: Number(body.size) || null,
      uploaded_by: String(body.name || '').slice(0, 40) || null,
      client_time: body.clientTime || null,
    });
    return json({ ...row, url: await db.signedUrl(path) });
  }

  const size = Number(body.size) || 0;
  if (size > VIDEO_MAX_BYTES) return json({ error: `Vidéo trop lourde (${Math.round(size / 1048576)} Mo, maximum 50 Mo). Refais une vidéo plus courte, 30 à 40 secondes.` }, 413);
  const ext = VIDEO_TYPES[body.type] || 'mp4';
  const path = `${c.id}/video-${phase}-${crypto.randomUUID()}.${ext}`;
  return json({ path, uploadUrl: await db.createUploadUrl(path) });
}
