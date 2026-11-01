import { notifyHost } from '@/lib/push';
import { isHost, isViewer, unauthorized, json } from '@/lib/util';

export async function POST(req) {
  if (!isViewer(req)) return unauthorized();
  return json(await notifyHost({ title: 'Test', body: 'Les notifications fonctionnent sur cet appareil.', url: '/admin' }));
}
