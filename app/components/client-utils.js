'use client';

export const STATUS = { planned: 'À faire', in_progress: 'En cours', done: 'Terminé', cancelled: 'Annulé' };

export function fmtDay(iso, today) {
  const s = fmtDayRaw(iso, today);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmtDayRaw(iso, today) {
  if (!iso) return '';
  if (today && iso === today) return "Aujourd'hui";
  const d = new Date(iso + 'T00:00:00Z');
  const t = today ? new Date(today + 'T00:00:00Z') : null;
  if (t && d - t === 86400000) return 'Demain';
  if (t && t - d === 86400000) return 'Hier';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}
export function fmtTime(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
export function fmtDateTime(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso));
}
export function fmtDuration(a, b) {
  if (!a || !b) return '-';
  const min = Math.round((new Date(b) - new Date(a)) / 60000);
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

// "Arrivée le jour même" : le prochain voyageur arrive le jour du ménage.
export function turnoverLabel(c) {
  if (!c.next_checkin) return null;
  if (c.next_checkin === c.date) return 'Arrivée le jour même';
  return `Prochaine arrivée : ${fmtDayRaw(c.next_checkin)}`;
}

// Réduit la photo avant l'envoi (1600 px max) pour aller vite même avec peu de réseau.
export async function compressImage(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    return blob || file;
  } catch {
    return file;
  }
}

export function storage() {
  try { return window.localStorage; } catch { return null; }
}
