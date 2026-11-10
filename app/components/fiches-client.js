'use client';
// Statut de la fiche de police d'un séjour, à partir des fiches reçues (rapprochement par date d'arrivée)
export function formsFor(stay, forms) {
  return (forms || []).filter((f) => f.arrival === stay.checkin_date);
}
export function guestUrl(info) {
  if (!info) return '';
  const origin = info.origin || (typeof location !== 'undefined' ? location.origin : '');
  return origin + info.path;
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
export const fmtD = (iso) => (iso ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso + 'T00:00:00Z')) : '-');
