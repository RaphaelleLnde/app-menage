import { db } from '@/lib/db';
import { isStaff, unauthorized, json, todayParis, addDays } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isStaff(req)) return unauthorized();
  const today = todayParis();
  const list = await db.listCleanings({ from: addDays(today, -3), to: addDays(today, 30), statuses: ['planned', 'in_progress', 'done'] });
  // Les ménages terminés ne restent visibles que le jour même.
  return json({ today, cleanings: list.filter((c) => c.status !== 'done' || c.date === today || (c.completed_at || '').slice(0, 10) === today).filter((c) => c.status !== 'planned' || c.date >= addDays(today, -1)) });
}

// Ménage imprévu (hors calendrier)
export async function POST(req) {
  if (!isStaff(req)) return unauthorized();
  const c = await db.insertCleaning({ date: todayParis(), source: 'manual', status: 'planned' });
  return json(c);
}
