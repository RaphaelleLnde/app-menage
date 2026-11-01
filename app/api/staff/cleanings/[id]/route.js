import { db } from '@/lib/db';
import { withPhotoUrls } from '@/lib/api';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  if (!isStaff(req)) return unauthorized();
  const c = await db.getCleaning(params.id);
  if (!c) return json({ error: 'Ménage introuvable' }, 404);
  return json(await withPhotoUrls(c));
}
