'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useHostData, HostPage } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { IconCopy } from '@/app/components/icons';
import { guestUrl, copyText, fmtD } from '@/app/components/fiches-client';

export default function Fiches() {
  const host = useHostData('/api/host/fiches');
  const d = host.data;
  const [msg, setMsg] = useState('');
  const [origin, setOrigin] = useState(null);

  const saveOrigin = async () => {
    const r = await fetch('/api/host/fiches', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin }) });
    const x = await r.json();
    if (!r.ok) { setMsg(x.error); return; }
    setMsg('Adresse enregistrée.'); setOrigin(null); host.reload();
  };

  return (
    <HostPage host={host}>
      {d && (
        <>
          <Back href="/admin/reservations" label="Réservations" />
          <h1 className="title"><span className="script">Voyageurs</span>Fiches de police</h1>
          {msg && <div className="ok">{msg}</div>}
          <div className="card">
            <h3>Lien à envoyer aux voyageurs</h3>
            <p className="muted small" style={{ marginTop: 0 }}>Le même lien pour toutes les réservations, par exemple dans ton message automatique Airbnb ou Booking. Le voyageur indique ses dates : la fiche se range toute seule sur la bonne réservation.</p>
            <input type="text" readOnly value={guestUrl(d)} onFocus={(e) => e.target.select()} />
            <div className="row wrap-row" style={{ marginTop: 8 }}>
              <button className="small primary" onClick={async () => setMsg((await copyText(guestUrl(d))) ? 'Lien copié.' : 'Copie impossible.')}><IconCopy /> Copier le lien</button>
              <a className="btn small" href={guestUrl(d)} target="_blank" rel="noreferrer">Voir comme un voyageur</a>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary className="small" style={{ cursor: 'pointer' }}>Adresse du site dans le lien (sans « ménage »)</summary>
              <p className="muted small">Si tu as ajouté une autre adresse dans Vercel (ex. https://le-central-mulhouse.vercel.app), indique-la ici : le lien ci-dessus l'utilisera.</p>
              <div className="row">
                <input type="text" placeholder="https://…" value={origin ?? (d.origin || '')} onChange={(e) => setOrigin(e.target.value)} />
                <button className="small primary" onClick={saveOrigin} disabled={origin === null}>Enregistrer</button>
              </div>
            </details>
          </div>

          <h2>Fiches reçues</h2>
          {d.forms.length === 0 && <p className="muted">Aucune fiche pour l'instant.</p>}
          {d.forms.map((f) => (
            <Link key={f.id} href={`/admin/fiches/${f.id}`} className="card" style={{ display: 'block' }}>
              <div className="row between">
                <b>{f.lead_name}</b>
                {f.all_french ? <span className="fstat fs-fr">Voyageurs français</span> : <span className="fstat fs-ok">{f.travellers.length} fiche{f.travellers.length > 1 ? 's' : ''}</span>}
              </div>
              <p className="muted small" style={{ margin: '4px 0 0' }}>Du {fmtD(f.arrival)} au {fmtD(f.departure)}{!f.all_french && ` · ${f.travellers.map((t) => t.nationality).join(', ')}`}</p>
            </Link>
          ))}
          <p className="muted small" style={{ marginTop: 16 }}>Les fiches sont gardées 6 mois après le départ, puis supprimées automatiquement, comme le prévoit la loi. À présenter à la police ou à la gendarmerie seulement si elles le demandent.</p>
        </>
      )}
    </HostPage>
  );
}
