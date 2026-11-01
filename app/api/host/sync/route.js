import { syncCalendar } from '@/lib/sync';
import { isHost, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!isHost(req)) return unauthorized();
  try {
    return json(await syncCalendar());
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
