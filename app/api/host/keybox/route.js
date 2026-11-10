import { setKeybox, setDoorCode } from '@/lib/property';
import { setVideoDays } from '@/lib/media';
import { isHost, unauthorized, json } from '@/lib/util';

export const dynamic = 'force-dynamic';

// { code } = boîte à clés, { door } = porte de l'immeuble, { videoDays } = conservation des vidéos
export async function PUT(req) {
  if (!isHost(req)) return unauthorized();
  const { code, door, videoDays } = await req.json();
  if (videoDays !== undefined) {
    if (![0, 14, 30, 60, 90].includes(videoDays)) return json({ error: 'Durée invalide' }, 400);
    await setVideoDays(videoDays);
    return json({ videoDays });
  }
  if (door !== undefined) {
    if (!String(door).trim()) return json({ error: 'Code vide' }, 400);
    return json(await setDoorCode(door));
  }
  if (!code || !String(code).trim()) return json({ error: 'Code vide' }, 400);
  return json(await setKeybox(code));
}
