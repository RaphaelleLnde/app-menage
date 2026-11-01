import { db } from '@/lib/db';
import { isHost, isViewer, unauthorized, json, todayParis, addDays } from '@/lib/util';
import { maybeSync } from '@/lib/sync';

export const dynamic = 'force-dynamic';

// Ménages sur une période (pour le calendrier)
export async function GET(req) {
  if (!isViewer(req)) return unauthorized();
  const u = new URL(req.url);
  const from = u.searchParams.get('from');
  const to = u.searchParams.get('to');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) return json({ error: 'Période invalide' }, 400);
  // On va chercher 40 jours plus loin pour retrouver les séjours en cours pendant la semaine affichée (départ plus tard).
  await maybeSync();
  const list = await db.listCleanings({ from, to: addDays(to, 40) });
  return json({ today: todayParis(), cleanings: list, staffPath: process.env.STAFF_TOKEN ? `/m/${process.env.STAFF_TOKEN}` : null });
}

export async function POST(req) {
  if (!isHost(req)) return unauthorized();
  const { date } = await req.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return json({ error: 'Date invalide' }, 400);
  return json(await db.insertCleaning({ date, source: 'manual', status: 'planned' }));
}
