import { cookies } from 'next/headers';
import { HOST_COOKIE, ROLE_COOKIE, json } from '@/lib/util';

export async function POST() {
  cookies().delete(HOST_COOKIE);
  cookies().delete(ROLE_COOKIE);
  return json({ ok: true });
}
