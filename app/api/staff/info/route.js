import { ADDRESS, getKeybox, getDoorCode } from '@/lib/property';
import { isStaff, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isStaff(req)) return unauthorized();
  const [keybox, door] = await Promise.all([getKeybox(), getDoorCode()]);
  return json({ address: ADDRESS, keybox, door });
}
