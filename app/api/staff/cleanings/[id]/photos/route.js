import crypto from 'crypto';
import { db } from '@/lib/db';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Réception d'une photo : l'heure et l'empreinte sont calculées ici, côté serveur.
export async function POST(req, { params }) {
  if (!isStaff(req)) return unauthorized();
  const c = await db.getCleaning(params.id);
  if (!c || c.status !== 'in_progress') return json({ error: 'Ménage non commencé ou déjà terminé' }, 409);
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Photo manquante' }, 400);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) return json({ error: 'Photo trop lourde' }, 413);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const checkId = form.get('checkId') ? Number(form.get('checkId')) : null;
  if (checkId && !c.checks.some((k) => k.id === checkId)) return json({ error: 'Tâche introuvable' }, 404);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const path = `${c.id}/${crypto.randomUUID()}.${type === 'image/png' ? 'png' : 'jpg'}`;
  await db.uploadFile(path, buffer, type);
  const row = await db.insertPhoto({
    cleaning_id: c.id,
    check_id: checkId,
    storage_path: path,
    sha256,
    size_bytes: buffer.length,
    uploaded_by: String(form.get('name') || '').slice(0, 40) || null,
    client_time: form.get('clientTime') || null,
  });
  return json({ ...row, url: await db.signedUrl(path) });
}
