import Link from 'next/link';

export const PROPERTY = process.env.NEXT_PUBLIC_PROPERTY_NAME || 'Le Central';
export const HOST_NAME = process.env.NEXT_PUBLIC_HOST_NAME || 'Raphaëlle';
export const HOST_PHONE = process.env.NEXT_PUBLIC_HOST_PHONE || '06.75.83.33.51';

export default function TopBar({ href = '/admin', right }) {
  return (
    <header className="top">
      <Link href={href} className="brand">{PROPERTY}</Link>
      {right}
    </header>
  );
}

export function Back({ href = '/admin', label = 'Accueil' }) {
  return <Link href={href} className="back" style={{ marginTop: 10 }}>‹ {label}</Link>;
}
