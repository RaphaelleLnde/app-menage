import { db } from './db';

// Informations pratiques du logement, servies uniquement avec le lien du personnel.
export const ADDRESS = { line1: '13 rue de la Sinne', line2: '68100 Mulhouse' };
export const DEFAULT_KEYBOX_CODE = '0410';

export async function getKeybox() {
  const k = await db.getState('keybox');
  return k || { code: DEFAULT_KEYBOX_CODE, updated_at: null };
}

export async function setKeybox(code) {
  const k = { code: String(code).trim().slice(0, 20), updated_at: new Date().toISOString() };
  await db.setState('keybox', k);
  return k;
}
