import { cookies } from 'next/headers';
import { safeEqual, setSession, json } from '@/lib/util';

export async function POST(req) {
  const { password } = await req.json();
  if (!process.env.HOST_PASSWORD || !safeEqual(password, process.env.HOST_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 800)); // freine les essais répétés
    return json({ error: 'Mot de passe incorrect' }, 401);
  }
  setSession(cookies(), 'host');
  return json({ ok: true });
}
