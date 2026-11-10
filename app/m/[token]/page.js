'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { STATUS, fmtDay, turnoverLabel } from '@/app/components/client-utils';
import TopBar, { HOST_NAME, HOST_PHONE } from '@/app/components/TopBar';
import { IconBroom } from '@/app/components/icons';
import Logement, { Photos } from '@/app/components/Logement';
import Horaires from '@/app/components/Horaires';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export default function StaffHome({ params }) {
  const { token } = params;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const l = document.createElement('link');
    l.rel = 'manifest';
    l.href = `/m/${token}/manifest.webmanifest`;
    document.head.appendChild(l);
  }, [token]);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await fetch('/api/staff/cleanings', { headers: { 'x-staff-token': token }, cache: 'no-store' });
      if (r.status === 401) { setError("Ce lien n'est pas valide. Demande le bon lien à l'hôte."); return; }
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setError('Connexion impossible. Vérifie le réseau puis réessaie.');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/staff/info', { headers: { 'x-staff-token': token }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).then(setInfo).catch(() => {});
  }, [token]);

  const unplanned = async () => {
    if (!confirm('Créer un ménage pour aujourd\'hui, en dehors du calendrier ?')) return;
    const r = await fetch('/api/staff/cleanings', { method: 'POST', headers: { 'x-staff-token': token } });
    if (r.ok) { const c = await r.json(); location.href = `/m/${token}/c/${c.id}`; }
  };

  return (
    <>
      <TopBar href={`/m/${token}`} right={<span className="who">Ménage</span>} />
      <main className="wrap">
        <Photos />
        <h1 className="title"><span className="script">Bonjour</span>Ménages prévus</h1>
        <p className="lead">Touche le ménage du jour pour le commencer.</p>
        {error && <div className="error">{error} <button className="small" onClick={load}>Réessayer</button></div>}
        {!data && !error && <p className="muted">Chargement…</p>}
        {data && (
          <>
            {data.cleanings.length === 0 && <p className="muted">Aucun ménage prévu pour le moment.</p>}
            {data.cleanings.map((c) => (
              <Link key={c.id} href={`/m/${token}/c/${c.id}`} className={c.date === data.today && c.status !== 'done' ? 'next' : 'card'} style={c.date === data.today && c.status !== 'done' ? {} : { display: 'grid', gridTemplateColumns: '58px 1fr', gap: 14, alignItems: 'center' }}>
                <div className="cal" style={c.date === data.today && c.status !== 'done' ? {} : { background: 'var(--blue-soft)', color: 'var(--blue)' }}>
                  <b>{Number(c.date.slice(8))}</b><span>{MONTHS[Number(c.date.slice(5, 7)) - 1]}</span>
                </div>
                <div>
                  <div className="row between">
                    <span className="t" style={{ fontWeight: 600 }}>{fmtDay(c.date, data.today)}</span>
                    <span className={`badge ${c.status}`}>{STATUS[c.status]}</span>
                  </div>
                  {c.next_checkin === c.date ? <em style={{ display: 'block', fontStyle: 'normal', fontSize: 13, fontWeight: 600, color: c.date === data.today && c.status !== 'done' ? '#F3D9A8' : 'var(--gold)' }}>Nouveaux voyageurs le jour même</em>
                    : turnoverLabel(c) && <div className="small" style={{ opacity: .8 }}>{turnoverLabel(c)}</div>}
                  {c.status === 'in_progress' && c.cleaner_name && <div className="small" style={{ opacity: .8 }}>Commencé par {c.cleaner_name}</div>}
                  {c.host_note && c.status !== 'done' && <div className="small" style={{ fontWeight: 600, color: c.date === data.today ? '#F3D9A8' : 'var(--gold)' }}>Consigne de l'hôte</div>}
                  {c.status !== 'done' && <Horaires late={c.late_checkout} early={c.early_checkin} light={c.date === data.today} style={{ marginTop: 6 }} />}
                </div>
              </Link>
            ))}
            <button className="small" style={{ marginTop: 18 }} onClick={unplanned}><IconBroom /> Ménage imprévu aujourd'hui</button>
          </>
        )}
        <Logement info={info} />
        <div className="card contact">
          <h3>Une question ?</h3>
          <div className="row between wrap-row">
            <div>
              <div style={{ fontWeight: 600 }}>Hôte {HOST_NAME}</div>
              <a href={`tel:+33${HOST_PHONE.replace(/\D/g, '').slice(1)}`} className="phone">{HOST_PHONE}</a>
            </div>
            <div className="row">
              <a className="btn small primary" href={`tel:+33${HOST_PHONE.replace(/\D/g, '').slice(1)}`}>Appeler</a>
              <a className="btn small" href={`sms:+33${HOST_PHONE.replace(/\D/g, '').slice(1)}`}>SMS</a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
