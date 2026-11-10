import { syncCalendar } from '@/lib/sync';
import { purgeOldVideos } from '@/lib/media';
import { purgeOldForms } from '@/lib/fiches';
import { safeEqual, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Appelée automatiquement (Vercel Cron ou Supabase pg_cron) avec : Authorization: Bearer CRON_SECRET
export async function GET(req) {
  const auth = req.headers.get('authorization') || '';
  if (!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) return json({ error: 'Accès refusé' }, 401);
  try {
    const sync = await syncCalendar();
    // Suppression automatique des vidéos trop anciennes (place limitée sur le stockage gratuit)
    const videosDeleted = await purgeOldVideos().catch((e) => { console.error(e); return 0; });
    // Fiches de police : conservées 6 mois après le départ, puis détruites
    const formsDeleted = await purgeOldForms().catch((e) => { console.error(e); return 0; });
    return json({ ...sync, videosDeleted, formsDeleted });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
