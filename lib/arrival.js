// État des lieux à l'arrivée du personnel (partagé entre les pages et le serveur)
export const ARRIVAL_AREAS = [
  { key: 'salon', label: 'Salon' },
  { key: 'cuisine', label: 'Cuisine' },
  { key: 'sdb', label: 'Salle de bain' },
  { key: 'chambre', label: 'Chambre' },
];
// mood : forme de la bouche du smiley (2 = grand sourire, -2 = très mécontent)
export const ARRIVAL_STATES = [
  { key: 'propre', label: 'Propre', color: '#2F9E5B', mood: 2 },
  { key: 'ras', label: 'Correct (RAS)', color: '#8BBF3F', mood: 1 },
  { key: 'sale', label: 'Sale', color: '#E8902A', mood: -1 },
  { key: 'tres_sale', label: 'Très sale / dégâts', color: '#D64545', mood: -2 },
];
export const stateInfo = (k) => ARRIVAL_STATES.find((s) => s.key === k);
export const BAD_STATES = ['sale', 'tres_sale'];
export const stateLabel = (k) => ARRIVAL_STATES.find((s) => s.key === k)?.label || '-';
export const areaLabel = (k) => ARRIVAL_AREAS.find((a) => a.key === k)?.label || k;
