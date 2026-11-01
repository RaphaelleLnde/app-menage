'use client';
import { useHostData, HostPage } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import Settings from '@/app/components/Settings';

export default function SettingsPage() {
  const host = useHostData('/api/host/overview');
  return (
    <HostPage host={host}>
      {host.data && (
        <>
          <Back />
          <h1 className="title"><span className="script">Réglages</span>{host.data.role === 'concierge' ? 'Notifications' : 'Paramètres'}</h1>
          <Settings data={host.data} reload={host.reload} />
        </>
      )}
    </HostPage>
  );
}
