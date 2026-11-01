import { db } from '@/lib/db';
import { maybeSync } from '@/lib/sync';
import { getChecklist } from '@/lib/checklist';
import { getNames } from '@/lib/staff';
import { getKeybox } from '@/lib/property';
import { isHost, isViewer, getRole, unauthorized, json, todayParis, addDays } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isViewer(req)) return unauthorized();
  await maybeSync();
  const today = todayParis();
  const [upcoming, history, lastSync, checklist, staffNames, keybox] = await Promise.all([
    db.listCleanings({ from: today, to: addDays(today, 90), statuses: ['planned', 'in_progress', 'cancelled'] }),
    db.listHistory(60),
    db.getState('last_sync'),
    getChecklist(),
    getNames(),
    getKeybox(),
  ]);
  const role = getRole(req);
  return json({
    role,
    conciergePath: role === 'host' && process.env.CONCIERGE_TOKEN ? `/conciergerie/${process.env.CONCIERGE_TOKEN}` : null,
    today,
    upcoming,
    history,
    lastSync,
    staffNames,
    keybox,
    checklistCount: checklist.length,
    checklistRooms: new Set(checklist.map((i) => i.room)).size,
    staffPath: process.env.STAFF_TOKEN ? `/m/${process.env.STAFF_TOKEN}` : null,
    icalConfigured: !!(process.env.ICAL_URL || process.env.ICAL_URL_BOOKING),
    icalSources: { airbnb: !!process.env.ICAL_URL, booking: !!process.env.ICAL_URL_BOOKING },
    pushConfigured: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  });
}
