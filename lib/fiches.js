import crypto from 'crypto';
import { db } from './db';

// Fiche individuelle de police (CESEDA art. R814-1 à R814-3) : chaque voyageur étranger
// (non français) remplit et signe une fiche ; les enfants de moins de 15 ans peuvent figurer
// sur celle d'un parent. Conservation : 6 mois, à remettre à la police ou gendarmerie sur demande.

// Code du lien public envoyé aux voyageurs (stable, dérivé du secret de l'application)
export function guestCode() {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev').update('fiche-police').digest('hex').slice(0, 10);
}
export function isGuestCode(code) {
  const a = Buffer.from(String(code || '')), b = Buffer.from(guestCode());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v, n = 120) => String(v ?? '').trim().slice(0, n);

// Vérifie et nettoie ce que le voyageur a envoyé. Renvoie { error } ou { row }.
export function cleanForm(b) {
  const arrival = str(b.arrival, 10), departure = str(b.departure, 10);
  const lead_name = str(b.lead_name, 120);
  const lead_phone = str(b.lead_phone, 40);
  if (!lead_name) return { error: 'name' };
  if (lead_phone.replace(/\D/g, '').length < 6) return { error: 'phone' };
  if (!DATE.test(arrival) || !DATE.test(departure) || departure <= arrival) return { error: 'dates' };
  const lang = ['fr', 'en', 'de', 'es'].includes(b.lang) ? b.lang : 'fr';
  if (b.all_french === true) return { row: { arrival, departure, lead_name, lead_phone, lang, all_french: true, travellers: [], children: [], signatures: [] } };

  const travellers = (Array.isArray(b.travellers) ? b.travellers : []).slice(0, 10).map((t) => ({
    last_name: str(t.last_name), first_names: str(t.first_names),
    birth_date: str(t.birth_date, 10), birth_place: str(t.birth_place),
    nationality: str(t.nationality, 60),
    address: str(t.address, 300), phone: str(t.phone, 40), email: str(t.email, 120),
    signature: typeof t.signature === 'string' && t.signature.startsWith('data:image/png;base64,') && t.signature.length < 300000 ? t.signature : '',
  }));
  if (!travellers.length) return { error: 'travellers' };
  for (const t of travellers) {
    if (!t.last_name || !t.first_names || !DATE.test(t.birth_date) || !t.birth_place || !t.nationality || !t.address || !t.phone || !t.email) return { error: 'fields' };
    if (!t.signature) return { error: 'signature' };
  }
  const children = (Array.isArray(b.children) ? b.children : []).slice(0, 10).map((c) => ({
    last_name: str(c.last_name), first_names: str(c.first_names), birth_date: str(c.birth_date, 10), parent: str(c.parent, 120),
  })).filter((c) => c.last_name || c.first_names);
  // Les signatures sont rangées à part (lourdes), dans le même ordre que les voyageurs
  const signatures = travellers.map((t) => t.signature);
  return { row: { arrival, departure, lead_name, lead_phone, lang, all_french: false, travellers: travellers.map(({ signature, ...t }) => t), children, signatures } };
}

// Le nom et le téléphone du voyageur sont recopiés sur la réservation qui arrive ce jour-là
export async function attachToStay(row) {
  const end = new Date(row.arrival + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + 60);
  const rows = await db.listCleanings({ from: row.arrival, to: end.toISOString().slice(0, 10) });
  const stay = rows.find((c) => c.checkin_date === row.arrival && !c.resa_gone);
  if (stay) await db.updateCleaning(stay.id, { guest_name: row.lead_name, guest_phone: row.lead_phone });
  return stay?.id || null;
}

// Les fiches sont détruites 6 mois après le départ
export async function purgeOldForms() {
  const d = new Date(Date.now() - 183 * 86400000).toISOString().slice(0, 10);
  return db.deleteGuestFormsBefore(d);
}
