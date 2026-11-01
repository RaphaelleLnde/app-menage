import { db } from '@/lib/db';
import { isHost, isViewer, unauthorized, json } from '@/lib/util';

export async function POST(req) {
  if (!isViewer(req)) return unauthorized();
  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys) return json({ error: 'Abonnement invalide' }, 400);
  await db.addPushSubscription(sub);
  return json({ ok: true });
}
