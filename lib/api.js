import { db } from './db';

// Ajoute à chaque photo une URL temporaire pour l'afficher.
export async function withPhotoUrls(cleaning) {
  if (!cleaning) return cleaning;
  const photos = await Promise.all(cleaning.photos.map(async (p) => ({ ...p, url: await db.signedUrl(p.storage_path) })));
  return { ...cleaning, photos };
}

// Vérifie qu'un ménage peut être validé : tout est coché et les photos obligatoires sont là.
export function missingForCompletion(cleaning) {
  const missing = [];
  for (const k of cleaning.checks) {
    if (!k.checked) missing.push(`${k.room} : ${k.label}`);
    else if (k.photo_required && !cleaning.photos.some((p) => p.check_id === k.id)) missing.push(`Photo manquante : ${k.label}`);
  }
  return missing;
}
