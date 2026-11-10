import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TYPES = { png: 'image/png', jpg: 'image/jpeg', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp' };

// Uniquement en mode démo : sert (et reçoit) les fichiers gardés en mémoire.
export async function GET(req) {
  if (process.env.DEMO_MODE !== '1') return new Response('Not found', { status: 404 });
  const u = new URL(req.url);
  const path = u.searchParams.get('path');
  const buf = await db.downloadFile(path);
  if (!buf) return new Response('Not found', { status: 404 });
  const headers = { 'Content-Type': TYPES[path.split('.').pop()] || 'application/octet-stream' };
  if (u.searchParams.get('dl')) headers['Content-Disposition'] = `attachment; filename="${u.searchParams.get('dl')}"`;
  return new Response(buf, { headers });
}

export async function PUT(req) {
  if (process.env.DEMO_MODE !== '1') return new Response('Not found', { status: 404 });
  const path = new URL(req.url).searchParams.get('path');
  await db.uploadFile(path, Buffer.from(await req.arrayBuffer()));
  return Response.json({ Key: path });
}
