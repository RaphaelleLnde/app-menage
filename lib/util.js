import crypto from 'crypto';

export const TZ = 'Europe/Paris';

// Date du jour à Paris au format AAAA-MM-JJ
export function todayParis(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// ---------- Personnel : le lien contient un jeton secret ----------
export function isStaff(req) {
  const token = req.headers.get('x-staff-token');
  return !!process.env.STAFF_TOKEN && safeEqual(token, process.env.STAFF_TOKEN);
}

// ---------- Hôte (mot de passe) et conciergerie (lien) -> cookie signé ----------
// Le cookie contient le rôle : « host » (tout) ou « concierge » (lecture + faire les ménages).
export const HOST_COOKIE = 'menage_host';
export const ROLE_COOKIE = 'menage_role'; // lisible par la page, uniquement pour adapter l'affichage

function sign(value) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev').update(value).digest('hex');
}
export function makeHostCookie(role = 'host') {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 90; // 90 jours
  return `${role}.${exp}.${sign(`${role}.${exp}`)}`;
}
export function roleFromCookie(value) {
  if (!value) return null;
  const [role, exp, sig] = String(value).split('.');
  if (!['host', 'concierge'].includes(role) || !(Number(exp) > Date.now())) return null;
  return safeEqual(sig, sign(`${role}.${exp}`)) ? role : null;
}
export function getRole(req) {
  return roleFromCookie(req.cookies.get(HOST_COOKIE)?.value);
}
// Hôte uniquement (réglages, modifications)
export function isHost(req) {
  return getRole(req) === 'host';
}
// Hôte ou conciergerie (consultation)
export function isViewer(req) {
  return getRole(req) !== null;
}
export function setSession(cookies, role) {
  const opts = { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90 };
  cookies.set(HOST_COOKIE, makeHostCookie(role), { ...opts, httpOnly: true });
  cookies.set(ROLE_COOKIE, role, opts);
}

export function json(data, status = 200) {
  return Response.json(data, { status });
}
export const unauthorized = () => json({ error: 'Accès refusé' }, 401);
