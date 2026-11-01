import { cookies } from 'next/headers';
import { safeEqual, setSession, json } from '@/lib/util';

// Le lien de la conciergerie ouvre une session « conciergerie » de 90 jours.
export async function POST(req) {
  const { token } = await req.json();
  if (!process.env.CONCIERGE_TOKEN || !safeEqual(token, process.env.CONCIERGE_TOKEN)) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: 'Lien non valide' }, 401);
  }
  setSession(cookies(), 'concierge');
  return json({ ok: true });
}
