import { db } from './db';

// Ajoute à chaque photo une URL temporaire pour l'afficher.
export async function withPhotoUrls(cleaning) {
  if (!cleaning) return cleaning;
  const videos = cleaning.videos || [];
  const urls = await db.signedUrls([...cleaning.photos, ...videos].map((p) => p.storage_path));
  const n = cleaning.photos.length;
  return {
    ...cleaning,
    photos: cleaning.photos.map((p, i) => ({ ...p, url: urls[i] })),
    videos: videos.map((v, i) => ({ ...v, url: urls[n + i] })),
  };
}

// Vérifie qu'un ménage peut être validé : tout est coché et les photos obligatoires sont là.
export function missingForCompletion(cleaning) {
  const missing = [];
  for (const k of cleaning.checks) {
    if (!k.checked) { if (k.required !== false) missing.push(`${k.room} : ${k.label}`); }
    else if (k.photo_required && !cleaning.photos.some((p) => p.check_id === k.id)) missing.push(`Photo manquante : ${k.label}`);
  }
  return missing;
}
