import { db } from './db';
import { parseIcal, reservationsToCleanings, mergeSources, platformOf } from './ical';
import { todayParis, addDays } from './util';

// Applique la liste des ménages issus du calendrier sur la base.
// Règles :
//  - nouveau départ -> nouveau ménage "prévu"
//  - départ déplacé -> le ménage prévu change de date
//  - réservation disparue -> le ménage prévu passe en "annulé"
//  - un ménage commencé ou terminé n'est jamais modifié
// okSources : plateformes dont le calendrier a bien été lu (on n'annule rien pour une plateforme injoignable)
export async function applyCalendar(cleanings, today = todayParis(), okSources = ['airbnb', 'booking']) {
  const since = addDays(today, -7);
  const existing = await db.getIcalCleanings(since);
  const byUid = new Map(existing.map((c) => [c.ical_uid, c]));
  const seen = new Set();
  const stats = { added: 0, moved: 0, cancelled: 0 };

  for (const c of cleanings) {
    if (c.date < since) continue;
    seen.add(c.ical_uid);
    const cur = byUid.get(c.ical_uid);
    if (!cur) {
      if (c.date < today) continue; // on ne crée pas de ménage dans le passé
      await db.insertCleaning({ ...c, source: 'ical', status: 'planned' });
      stats.added++;
    } else {
      const patch = {};
      // Infos de réservation : toujours mises à jour
      for (const k of ['checkin_date', 'next_checkin', 'resa_code', 'guest_phone4']) if ((cur[k] ?? null) !== (c[k] ?? null)) patch[k] = c[k] ?? null;
      if (cur.resa_gone) patch.resa_gone = false;
      // Le ménage lui-même n'est modifié que s'il n'a pas commencé
      if (cur.status === 'planned' || (cur.status === 'cancelled' && cur.resa_gone)) {
        if (cur.date !== c.date) { patch.date = c.date; stats.moved++; }
        if (cur.status === 'cancelled') patch.status = 'planned'; // la réservation est revenue
      }
      if (Object.keys(patch).length) await db.updateCleaning(cur.id, patch);
    }
  }
  for (const cur of existing) {
    if (!seen.has(cur.ical_uid) && okSources.includes(platformOf(cur.ical_uid)) && cur.status === 'planned' && cur.date >= today) {
      await db.updateCleaning(cur.id, { status: 'cancelled', resa_gone: true });
      stats.cancelled++;
    } else if (!seen.has(cur.ical_uid) && okSources.includes(platformOf(cur.ical_uid)) && !cur.resa_gone && cur.date >= today) {
      await db.updateCleaning(cur.id, { resa_gone: true });
    }
  }
  return stats;
}

async function fetchIcal(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'app-menage/1.0' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseIcal(await res.text());
}

// Lit les calendriers Airbnb (ICAL_URL) et Booking.com (ICAL_URL_BOOKING)
export async function syncCalendar() {
  const sources = { airbnb: process.env.ICAL_URL, booking: process.env.ICAL_URL_BOOKING };
  if (!sources.airbnb && !sources.booking) return { skipped: 'Aucun calendrier configuré' };
  const events = { airbnb: [], booking: [] };
  const ok = [];
  const errors = [];
  for (const [name, url] of Object.entries(sources)) {
    if (!url) continue;
    try { events[name] = await fetchIcal(url); ok.push(name); } catch (e) { errors.push(`${name} : ${e.message}`); }
  }
  if (!ok.length) throw new Error(`Calendriers inaccessibles (${errors.join(', ')})`);
  const stats = await applyCalendar(reservationsToCleanings(mergeSources(events.airbnb, events.booking)), todayParis(), ok);
  const result = { ...stats, sources: ok, errors };
  await db.setState('last_sync', { at: new Date().toISOString(), ...result });
  return result;
}

// Synchronise si la dernière lecture date de plus de 30 minutes.
export async function maybeSync() {
  try {
    const last = await db.getState('last_sync');
    if (last && Date.now() - new Date(last.at).getTime() < 30 * 60 * 1000) return;
    await syncCalendar();
  } catch (e) {
    console.error('Synchro calendrier :', e.message);
  }
}
