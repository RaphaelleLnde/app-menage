import { db } from './db';

// Checklist proposée par défaut, modifiable ensuite dans l'espace hôte.
// photo: true = une photo est obligatoire pour cette tâche.
// Les tâches évidentes (4e valeur false) sont facultatives : non cochées, elles ne déclenchent pas d'alerte.
export const DEFAULT_CHECKLIST = [
  ['Entrée et séjour', 'Aérer le logement pendant le ménage', false, false],
  ['Entrée et séjour', 'Dépoussiérer meubles, étagères et télécommandes', false],
  ['Entrée et séjour', 'Aspirer et laver les sols', false],
  ['Entrée et séjour', 'Coussins et plaids remis en place', true],
  ['Cuisine', 'Vaisselle propre, sèche et rangée', false],
  ['Cuisine', 'Plan de travail, plaques et évier nettoyés', true],
  ['Cuisine', 'Intérieur du frigo vidé et nettoyé', true],
  ['Cuisine', 'Micro-ondes, four et cafetière nettoyés', false],
  ['Cuisine', 'Poubelles vidées, sacs neufs', false],
  ['Salle de bain', 'Douche ou baignoire, lavabo et robinetterie détartrés', true],
  ['Salle de bain', 'WC nettoyés et désinfectés', true],
  ['Salle de bain', 'Miroir sans traces', false],
  ['Salle de bain', 'Serviettes propres installées', true],
  ['Chambre', 'Lit fait avec draps propres', true],
  ['Chambre', 'Sous le lit et derrière les meubles vérifiés', false],
  ['Chambre', 'Placard et cintres rangés', false],
  ['Linge et consommables', 'Linge sale emporté ou lancé en machine', false],
  ['Linge et consommables', 'Papier toilette, savon, gel douche réapprovisionnés', false],
  ['Linge et consommables', 'Café, thé, sel, poivre, huile vérifiés', false],
  ['Linge et consommables', 'Produits ménagers ou consommables manquants signalés en commentaire', false],
  ['Départ', 'Objets oubliés par les voyageurs signalés', false],
  ['Départ', 'Fenêtres fermées, chauffage ou clim en mode éco', false, false],
  ['Départ', 'Lumières éteintes, porte fermée à clé', false, false],
].map(([room, label, photo_required, required = true], position) => ({ room, label, photo_required, required, position }));

export async function getChecklist() {
  let items = await db.listChecklistItems();
  if (!items.length) {
    await db.replaceChecklistItems(DEFAULT_CHECKLIST);
    items = await db.listChecklistItems();
  }
  return items;
}
