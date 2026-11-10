import { db } from '@/lib/db';
import { cleanForm, isGuestCode, attachToStay } from '@/lib/fiches';
import { json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Formulaire public envoyé aux voyageurs (fiche de police)
export async function POST(req, { params }) {
  if (!isGuestCode(params.code)) return json({ error: 'not_found' }, 404);
  const body = await req.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // champ piège : robots
  const { error, row } = cleanForm(body);
  if (error) return json({ error }, 400);
  await db.insertGuestForm(row);
  await attachToStay(row).catch((e) => console.error(e)); // nom et téléphone sur la réservation
  return json({ ok: true });
}
