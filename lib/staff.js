import { db } from './db';

// Liste des prénoms déjà utilisés, partagée entre tous les téléphones.
export async function getNames() {
  return (await db.getState('staff_names')) || [];
}

export async function addName(name) {
  const n = String(name || '').trim().slice(0, 40);
  if (!n) return getNames();
  const names = await getNames();
  if (!names.some((x) => x.toLowerCase() === n.toLowerCase())) {
    names.push(n);
    names.sort((a, b) => a.localeCompare(b, 'fr'));
    await db.setState('staff_names', names.slice(0, 50));
  }
  return getNames();
}

export async function removeName(name) {
  const names = (await getNames()).filter((x) => x !== name);
  await db.setState('staff_names', names);
  return names;
}
