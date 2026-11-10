import { fmtHour } from '@/lib/horaires';
import { IconClock } from '@/app/components/icons';

// Bandeau « Départ tardif / Arrivée anticipée » affiché au personnel et à la conciergerie
export default function Horaires({ late, early, light = false, style }) {
  if (!late && !early) return null;
  return (
    <div className={`horaires ${light ? 'light' : ''}`} style={style}>
      <IconClock />
      <div>
        {late && <div><b>Départ tardif</b> : les voyageurs partent à {fmtHour(late)}</div>}
        {early && <div><b>Arrivée anticipée</b> : les voyageurs suivants arrivent à {fmtHour(early)}</div>}
      </div>
    </div>
  );
}
