import { notFound } from 'next/navigation';
import { isGuestCode } from '@/lib/fiches';
import GuestForm from './GuestForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Le Central · Check-in',
  appleWebApp: { capable: false, title: 'Le Central' },
};

export default function Page({ params }) {
  if (!isGuestCode(params.code)) notFound();
  return <GuestForm code={params.code} />;
}
