import { notifyHost } from '@/lib/push';
import { isViewer, getRole, unauthorized, json } from '@/lib/util';

export async function POST(req) {
  if (!isViewer(req)) return unauthorized();
  // Le test ne part que vers les appareils du même rôle (hôte ou conciergerie)
  return json(await notifyHost({ title: 'Test', body: 'Les notifications fonctionnent sur cet appareil.', url: '/admin', to: [getRole(req)] }));
}
