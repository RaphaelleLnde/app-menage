// Lecture du calendrier iCal Airbnb.
// Airbnb publie deux types d'événements :
//  - SUMMARY "Reserved" : une vraie réservation (DTSTART = arrivée, DTEND = départ)
//  - SUMMARY "Airbnb (Not available)" : un blocage de dates, sans ménage
// Les dates sont au format VALUE=DATE (AAAAMMJJ).

function unfold(text) {
  // Les lignes longues iCal sont repliées : une ligne qui commence par un espace continue la précédente.
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function toIsoDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseIcal(text) {
  const lines = unfold(text).split('\n');
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const name = line.slice(0, idx).split(';')[0].toUpperCase();
    const value = line.slice(idx + 1).trim();
    if (name === 'UID') cur.uid = value;
    else if (name === 'DTSTART') cur.start = toIsoDate(value);
    else if (name === 'DTEND') cur.end = toIsoDate(value);
    else if (name === 'SUMMARY') cur.summary = value;
    else if (name === 'DESCRIPTION') cur.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
  }
  return events.filter((e) => e.uid && e.start && e.end);
}

// Plateforme d'origine d'un ménage, d'après son identifiant
export function platformOf(uid) {
  return String(uid || '').startsWith('booking:') ? 'booking' : 'airbnb';
}

// Booking.com exporte chaque réservation sous le titre « CLOSED - Not available » :
// on garde tous ses événements, sauf ceux qui recouvrent une réservation Airbnb
// (ce sont alors des dates importées depuis Airbnb, pas de vraies réservations Booking).
export function mergeSources(airbnbEvents, bookingEvents) {
  const air = airbnbEvents.filter(isReservation);
  const overlaps = (a, b) => a.start < b.end && b.start < a.end;
  const book = bookingEvents
    .filter((e) => !air.some((a) => overlaps(a, e)))
    .map((e) => ({ ...e, uid: 'booking:' + e.uid, summary: 'Booking' }));
  return [...air, ...book];
}

export function isReservation(ev) {
  const s = (ev.summary || '').toLowerCase();
  if (s.includes('not available') || s.includes('indisponible') || s.includes('blocked')) return false;
  return true;
}

// Transforme les réservations en ménages : un ménage le jour de chaque départ.
// nextCheckin = date de la prochaine arrivée (pour savoir si c'est un "jour de rotation").
export function reservationsToCleanings(events) {
  const resa = events.filter((e) => e.summary === 'Booking' || isReservation(e)).sort((a, b) => a.start.localeCompare(b.start));
  return resa.map((r) => {
    const next = resa.find((o) => o.uid !== r.uid && o.start >= r.end);
    const desc = r.description || '';
    return {
      ical_uid: r.uid,
      date: r.end,
      checkin_date: r.start,
      next_checkin: next ? next.start : null,
      resa_code: (/details\/([A-Z0-9]{6,})/.exec(desc) || [])[1] || null,
      guest_phone4: (/Last 4 Digits\)\s*:\s*(\d{4})/i.exec(desc) || [])[1] || null,
    };
  });
}
