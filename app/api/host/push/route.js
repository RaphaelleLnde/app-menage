import { db } from '@/lib/db';
import { isViewer, getRole, unauthorized, json } from '@/lib/util';

export async function POST(req) {
  if (!isViewer(req)) return unauthorized();
  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys) return json({ error: 'Abonnement invalide' }, 400);
  // On retient qui a activé les notifications : l'hôte ou la conciergerie
  await db.addPushSubscription({ ...sub, role: getRole(req) === 'concierge' ? 'concierge' : 'host' });
  return json({ ok: true });
}
