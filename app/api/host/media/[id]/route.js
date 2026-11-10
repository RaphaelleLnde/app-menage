import { db } from '@/lib/db';
import { mediaFilename } from '@/lib/media';
import { isViewer, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Téléchargement d'une photo ou d'une vidéo : redirection vers un lien temporaire du stockage,
// avec un nom de fichier lisible (date, pièce ou tâche, heure).
export async function GET(req, { params }) {
  if (!isViewer(req)) return unauthorized();
  const m = await db.getMedia(params.id);
  if (!m) return json({ error: 'Fichier introuvable' }, 404);
  const c = await db.getCleaning(m.cleaning_id);
  const k = c?.checks.find((x) => x.id === m.check_id);
  const url = await db.downloadUrl(m.storage_path, mediaFilename(m, c, k?.label));
  return Response.redirect(new URL(url, req.url), 302);
}
