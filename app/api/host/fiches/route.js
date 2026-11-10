import { db } from '@/lib/db';
import { guestCode } from '@/lib/fiches';
import { isHost, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Fiches de police reçues (hôte uniquement : données personnelles)
export async function GET(req) {
  if (!isHost(req)) return unauthorized();
  const u = new URL(req.url);
  const forms = await db.listGuestForms({ from: u.searchParams.get('from') || undefined, to: u.searchParams.get('to') || undefined });
  return json({ forms, path: `/bienvenue/${guestCode()}`, origin: (await db.getState('guest_origin')) || null });
}

// Adresse du site à utiliser dans le lien envoyé aux voyageurs (ex. un domaine sans « ménage »)
export async function PUT(req) {
  if (!isHost(req)) return unauthorized();
  const { origin } = await req.json();
  const o = String(origin || '').trim().replace(/\/+$/, '');
  if (o && !/^https:\/\/[a-z0-9.-]+$/i.test(o)) return json({ error: 'Adresse invalide (ex. https://le-central.vercel.app)' }, 400);
  await db.setState('guest_origin', o || null);
  return json({ origin: o || null });
}
