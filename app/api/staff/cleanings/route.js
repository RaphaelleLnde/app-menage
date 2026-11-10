import { db } from '@/lib/db';
import { annotateTimes } from '@/lib/horaires';
import { isStaff, unauthorized, json, todayParis, addDays } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isStaff(req)) return unauthorized();
  const today = todayParis();
  const [list, rows] = await Promise.all([
    db.listCleanings({ from: addDays(today, -3), to: addDays(today, 30), statuses: ['planned', 'in_progress', 'done'] }),
    db.listCleanings({ from: addDays(today, -3), to: addDays(today, 90) }), // pour retrouver les arrivées anticipées
  ]);
  // Les ménages terminés ne restent visibles que le jour même.
  const visible = list.filter((c) => c.status !== 'done' || c.date === today || (c.completed_at || '').slice(0, 10) === today).filter((c) => c.status !== 'planned' || c.date >= addDays(today, -1));
  return json({ today, cleanings: annotateTimes(visible, rows).map(strip) });
}

// Le personnel ne voit pas les notes privées de l'hôte
function strip({ host_memo, resa_code, guest_phone4, guest_name, ...c }) { return c; }

// Ménage imprévu (hors calendrier)
export async function POST(req) {
  if (!isStaff(req)) return unauthorized();
  const c = await db.insertCleaning({ date: todayParis(), source: 'manual', status: 'planned' });
  return json(c);
}
