'use client';
import { useHostData, HostPage } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { fmtD } from '@/app/components/fiches-client';
import FicheView from '@/app/components/FicheView';

const LANG = { fr: 'français', en: 'anglais', de: 'allemand', es: 'espagnol' };

export default function Fiche({ params }) {
  const host = useHostData(`/api/host/fiches/${params.id}`);
  const f = host.data;
  const remove = async () => {
    if (!confirm('Supprimer définitivement cette fiche ?')) return;
    await fetch(`/api/host/fiches/${params.id}`, { method: 'DELETE' });
    location.href = '/admin/fiches';
  };
  const sent = f && new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' }).format(new Date(f.created_at));
  return (
    <HostPage host={host}>
      {f && (
        <>
          <Back href="/admin/fiches" label="Fiches de police" />
          <h1 className="title"><span className="script">Le Central</span>{f.all_french ? 'Déclaration' : 'Fiche de police'}</h1>
          <p className="muted small" style={{ margin: 0 }}>Logement : Le Central, 13 rue de la Sinne, 68100 Mulhouse<br />Réservation au nom de <b>{f.lead_name}</b>{f.lead_phone ? ` (tél. ${f.lead_phone})` : ''}, du {fmtD(f.arrival)} au {fmtD(f.departure)}<br />Envoyée le {sent} (formulaire en {LANG[f.lang] || f.lang})</p>
          <div className="row wrap-row noprint" style={{ marginTop: 12 }}>
            <button className="small primary" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
            <button className="small danger" onClick={remove}>Supprimer</button>
          </div>
          <FicheView f={f} />
        </>
      )}
    </HostPage>
  );
}
