import { ADDRESS, getKeybox } from '@/lib/property';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isStaff(req)) return unauthorized();
  return json({ address: ADDRESS, keybox: await getKeybox() });
}
