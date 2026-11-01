import { db } from '@/lib/db';
import { buildCleaningPdf } from '@/lib/pdf';
import { isHost, isViewer, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req, { params }) {
  if (!isViewer(req)) return unauthorized();
  const c = await db.getCleaning(params.id);
  if (!c) return json({ error: 'Ménage introuvable' }, 404);
  const photos = await Promise.all(c.photos.map(async (p) => ({ ...p, buffer: await db.downloadFile(p.storage_path).catch(() => null) })));
  const pdf = await buildCleaningPdf(c, photos, process.env.NEXT_PUBLIC_PROPERTY_NAME || 'Le Central');
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Rapport menage - ${c.date}.pdf"; filename*=UTF-8''${encodeURIComponent(`Rapport ménage - ${c.date.split('-').reverse().join('-')}.pdf`)}`,
    },
  });
}
