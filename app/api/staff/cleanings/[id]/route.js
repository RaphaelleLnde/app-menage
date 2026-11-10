import { db } from '@/lib/db';
import { withPhotoUrls } from '@/lib/api';
import { cleaningTimes } from '@/lib/horaires';
import { isStaff, unauthorized, json, addDays } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  if (!isStaff(req)) return unauthorized();
  const c = await db.getCleaning(params.id);
  if (!c) return json({ error: 'Ménage introuvable' }, 404);
  const rows = await db.listCleanings({ from: c.date, to: addDays(c.date, 60) });
  const { host_memo, resa_code, guest_phone4, guest_name, guest_phone, ...rest } = await withPhotoUrls(c);
  return json({ ...rest, ...cleaningTimes(c, rows) });
}
