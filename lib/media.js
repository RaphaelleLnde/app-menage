import { db } from './db';
import { areaLabel } from './arrival';

// Vidéos : 50 Mo maximum par fichier (limite du stockage Supabase gratuit)
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_PHASES = ['arrivee', 'menage'];
export const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/3gpp': '3gp' };

// Durée de conservation des vidéos (en jours, 0 = toujours). Elles prennent beaucoup de place.
export const DEFAULT_VIDEO_DAYS = 30;
export async function getVideoDays() {
  const v = await db.getState('video_days');
  return Number.isInteger(v) ? v : DEFAULT_VIDEO_DAYS;
}
export async function setVideoDays(days) {
  await db.setState('video_days', days);
}

export async function purgeOldVideos() {
  const days = await getVideoDays();
  if (!days) return 0;
  const old = await db.listOldVideos(new Date(Date.now() - days * 86400000).toISOString());
  await db.deleteMedia(old);
  return old.length;
}

const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Nom de fichier lisible pour le téléchargement, ex. LeCentral_2026-11-10_arrivee_Salon_14h32.jpg
export function mediaFilename(m, cleaning, checkLabel) {
  const t = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(m.received_at)).replace(':', 'h');
  const ext = (m.storage_path.split('.').pop() || 'jpg').toLowerCase();
  const what = m.kind === 'video'
    ? `video-${m.phase === 'arrivee' ? 'arrivee' : 'apres-menage'}`
    : m.phase === 'arrivee' ? `arrivee_${strip(areaLabel(m.area))}` : strip(checkLabel || 'autre-photo').slice(0, 40);
  return `LeCentral_${cleaning?.date || ''}_${what}_${t}.${ext}`;
}
