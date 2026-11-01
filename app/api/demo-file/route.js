import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Uniquement en mode démo : sert les photos gardées en mémoire.
export async function GET(req) {
  if (process.env.DEMO_MODE !== '1') return new Response('Not found', { status: 404 });
  const path = new URL(req.url).searchParams.get('path');
  const buf = await db.downloadFile(path);
  if (!buf) return new Response('Not found', { status: 404 });
  return new Response(buf, { headers: { 'Content-Type': path.endsWith('.png') ? 'image/png' : 'image/jpeg' } });
}
