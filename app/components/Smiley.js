// Smiley de couleur pour l'état du logement
export default function Smiley({ color, mood, size = 44 }) {
  // bouche : courbe vers le haut (contente) ou vers le bas (mécontente)
  const curve = { 2: 'M14 27 Q22 36 30 27', 1: 'M15 28 Q22 32 29 28', [-1]: 'M15 31 Q22 27 29 31', [-2]: 'M14 33 Q22 25 30 33' }[mood];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" style={{ display: 'block' }}>
      <circle cx="22" cy="22" r="20" fill={color} />
      <circle cx="15.5" cy="17" r="2.6" fill="#fff" />
      <circle cx="28.5" cy="17" r="2.6" fill="#fff" />
      <path d={curve} stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
