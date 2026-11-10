import { guestCode } from '@/lib/fiches';
import GuestForm from '../bienvenue/[code]/GuestForm';

// Adresse courte à envoyer aux voyageurs : /checkin (l'ancienne adresse /bienvenue/<code> marche toujours)
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Le Central · Check-in', appleWebApp: { capable: false, title: 'Le Central' } };

export default function Page() {
  return <GuestForm code={guestCode()} />;
}
