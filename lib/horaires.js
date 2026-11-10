// Départ tardif (late check-out) et arrivée anticipée (early check-in).
// Ils sont notés sur la réservation (ligne du ménage de départ, du checkin_date au date) :
//  - checkout_time : heure de départ des voyageurs, le jour du ménage de cette ligne
//  - checkin_time  : heure d'arrivée des voyageurs, le jour checkin_date (= jour du ménage précédent)

export const isTime = (t) => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

// « 13:00 » → « 13 h », « 13:30 » → « 13 h 30 »
export function fmtHour(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${Number(h)} h${m && m !== '00' ? ' ' + m : ''}`;
}

// Horaires qui concernent un ménage : départ tardif des voyageurs sortants, arrivée anticipée des suivants
export function cleaningTimes(c, rows) {
  const next = rows.find((s) => s.id !== c.id && s.checkin_date === c.date && !s.resa_gone);
  return { late_checkout: c.checkout_time || null, early_checkin: next?.checkin_time || null };
}

export function annotateTimes(list, rows) {
  return list.map((c) => ({ ...c, ...cleaningTimes(c, rows) }));
}
