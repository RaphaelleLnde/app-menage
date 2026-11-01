import { syncCalendar } from '@/lib/sync';
import { safeEqual, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// Appelée automatiquement (Vercel Cron ou Supabase pg_cron) avec : Authorization: Bearer CRON_SECRET
export async function GET(req) {
  const auth = req.headers.get('authorization') || '';
  if (!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) return json({ error: 'Accès refusé' }, 401);
  try {
    return json(await syncCalendar());
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
