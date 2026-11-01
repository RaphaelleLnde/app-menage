'use client';
import { useState } from 'react';
import { useHostData, HostPage, useRole } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { IconCheck } from '@/app/components/icons';
import { STATUS, fmtDay, fmtDateTime, fmtTime, fmtDuration, turnoverLabel } from '@/app/components/client-utils';

export default function AdminCleaning({ params }) {
  const { id } = params;
  const host = useHostData(`/api/host/cleanings/${id}`);
  const c = host.data;
  const [zoom, setZoom] = useState(null);
  const concierge = useRole() === 'concierge';

  const reopen = async () => {
    if (!confirm('Rouvrir ce ménage ? Il repassera « en cours » et pourra être complété puis validé à nouveau.')) return;
    await fetch(`/api/host/cleanings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress' }) });
    host.reload();
  };

  const Photo = ({ p }) => (
    <figure>
      <img src={p.url} alt="" onClick={() => setZoom(p.url)} />
      <figcaption>{fmtDateTime(p.received_at)}{p.uploaded_by ? ` · ${p.uploaded_by}` : ''}<br /><span title={p.sha256}>SHA-256 {p.sha256.slice(0, 12)}…</span></figcaption>
    </figure>
  );

  return (
    <HostPage host={host}>
      {c && (() => {
        const rooms = [...new Set(c.checks.map((k) => k.room))];
        const general = c.photos.filter((p) => !p.check_id);
        const back = c.status === 'done' ? ['/admin/historique', 'Historique'] : ['/admin/calendrier', 'Calendrier'];
        return (
          <>
            <Back href={back[0]} label={back[1]} />
            <h1 className="title"><span className="script">Ménage n° {c.number}</span>{fmtDay(c.date)}</h1>
            <div className="row wrap-row" style={{ gap: 8 }}>
              <span className={`badge ${c.status}`}>{STATUS[c.status]}</span>
              {turnoverLabel(c) && <span className="muted small">{turnoverLabel(c)}</span>}
            </div>

            {c.has_remarks && (
              <div className={c.remarks_seen ? 'callout' : 'alert'} style={{ marginTop: 14 }}>
                <b>{c.remarks_seen ? 'Remarques vues' : 'Remarques à vérifier'}</b>
                {c.notes && <span style={{ display: 'block', whiteSpace: 'pre-line' }}>« {c.notes} »</span>}
                {general.length > 0 && <span style={{ display: 'block' }}>{general.length} photo{general.length > 1 ? 's' : ''} de problème, en bas de la page.</span>}
                {!c.remarks_seen && !concierge && (
                  <button className="small primary" style={{ marginTop: 10 }} onClick={async () => {
                    await fetch(`/api/host/cleanings/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remarks_seen: true }) });
                    host.reload();
                  }}>C'est vu</button>
                )}
              </div>
            )}

            <div className="card">
              <ul className="rows">
                <li className="row between"><span className="muted">Commencé par</span><b>{c.cleaner_name || '-'}{c.started_at && `, ${fmtTime(c.started_at)}`}</b></li>
                <li className="row between"><span className="muted">Terminé par</span><b>{c.completed_by || '-'}{c.completed_at && `, ${fmtTime(c.completed_at)}`}</b></li>
                <li className="row between"><span className="muted">Durée</span><b>{fmtDuration(c.started_at, c.completed_at)}</b></li>
                <li className="row between"><span className="muted">Photos</span><b>{c.photos.length}</b></li>
              </ul>
              {c.host_note && <div className="callout" style={{ marginBottom: 0 }}><b>Ta consigne</b><span style={{ whiteSpace: 'pre-line' }}>{c.host_note}</span></div>}
              {c.notes && !c.has_remarks && <div className="callout" style={{ marginBottom: 0 }}><b>Commentaire du personnel</b>{c.notes}</div>}
              <div className="row wrap-row" style={{ marginTop: 14 }}>
                {c.checks.length > 0 && <a className="btn primary small" href={`/api/host/cleanings/${c.id}/pdf`}>Télécharger le PDF</a>}
                {!concierge && c.status === 'done' && <button className="small" onClick={reopen}>Rouvrir</button>}
              </div>
            </div>

            {c.checks.length === 0 && <p className="muted">Le ménage n'a pas encore commencé.</p>}
            {rooms.map((room) => (
              <section key={room} className="card">
                <h3>{room}</h3>
                {c.checks.filter((k) => k.room === room).map((k) => {
                  const ph = c.photos.filter((p) => p.check_id === k.id);
                  return (
                    <div key={k.id} className="task" style={{ display: 'block' }}>
                      <div className="row" style={{ alignItems: 'flex-start' }}>
                        <span className={`tick ${k.checked ? 'on' : ''}`}>{k.checked && <IconCheck />}</span>
                        <span className="grow" style={{ paddingTop: 2 }}>{k.label}</span>
                        {k.checked_at && <span className="muted small" style={{ paddingTop: 3 }}>{fmtTime(k.checked_at)}</span>}
                      </div>
                      {ph.length > 0 && <div className="photo-grid" style={{ marginTop: 10 }}>{ph.map((p) => <Photo key={p.id} p={p} />)}</div>}
                    </div>
                  );
                })}
              </section>
            ))}
            {general.length > 0 && (
              <section className="card">
                <h3>Photos de problème</h3>
                <div className="photo-grid">{general.map((p) => <Photo key={p.id} p={p} />)}</div>
              </section>
            )}
            {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
          </>
        );
      })()}
    </HostPage>
  );
}
