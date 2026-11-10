'use client';
import { useState } from 'react';
import { useHostData, HostPage, useRole } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { IconCheck, IconDownload } from '@/app/components/icons';
import { STATUS, fmtDay, fmtDateTime, fmtTime, fmtDuration, turnoverLabel } from '@/app/components/client-utils';
import { ARRIVAL_AREAS, BAD_STATES, stateLabel, stateInfo } from '@/lib/arrival';
import Smiley from '@/app/components/Smiley';

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

  const Photo = ({ p, title }) => (
    <figure>
      {title && <b className="small" style={{ display: 'block', marginBottom: 4 }}>{title}</b>}
      <div className="stamp-wrap">
        <img src={p.url} alt="" onClick={() => setZoom(p)} />
        <span className="stamp">{fmtDateTime(p.received_at)}</span>
      </div>
      <figcaption>{fmtDateTime(p.received_at)}{p.uploaded_by ? ` · ${p.uploaded_by}` : ''}<br /><span title={p.sha256}>SHA-256 {String(p.sha256).slice(0, 12)}…</span></figcaption>
      <a className="dl" href={`/api/host/media/${p.id}`} download><IconDownload /> Télécharger</a>
    </figure>
  );

  // Vidéo globale (à l'arrivée ou après le ménage), avec un bouton de téléchargement
  const videos = (phase, title) => {
    const list = (c?.videos || []).filter((v) => v.phase === phase);
    return (
      <div style={{ marginBottom: 12 }}>
        <b className="small" style={{ display: 'block', marginBottom: 6 }}>{title}</b>
        {list.length === 0 && <p className="muted small" style={{ margin: 0 }}>{c.status === 'done' ? 'Pas de vidéo (non faite, ou supprimée après le délai de conservation).' : 'Pas encore de vidéo.'}</p>}
        {list.map((v) => (
          <div key={v.id} style={{ marginBottom: 8 }}>
            <video className="vid" src={v.url} controls playsInline preload="metadata" style={{ marginBottom: 4 }} />
            <div className="row between wrap-row">
              <span className="muted small">Reçue le {fmtDateTime(v.received_at)}{v.uploaded_by ? ` · ${v.uploaded_by}` : ''}{v.size_bytes >= 1048576 ? ` · ${Math.round(v.size_bytes / 1048576)} Mo` : ''}</span>
              <a className="btn small" href={`/api/host/media/${v.id}`} download><IconDownload /> Télécharger la vidéo</a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <HostPage host={host}>
      {c && (() => {
        const rooms = [...new Set(c.checks.map((k) => k.room))];
        const general = c.photos.filter((p) => !p.check_id && (p.phase || 'menage') === 'menage');
        const arrivalPhotos = c.photos.filter((p) => p.phase === 'arrivee');
        const notDone = c.checks.filter((k) => !k.checked && k.required !== false);
        const noPhoto = c.checks.filter((k) => k.checked && k.photo_required && !c.photos.some((p) => p.check_id === k.id));
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
                {c.arrival_done_at && (BAD_STATES.includes(c.arrival_state) || c.arrival_note) && <span style={{ display: 'block' }}>À l'arrivée : logement {stateLabel(c.arrival_state).toLowerCase()}{c.arrival_note ? ` (« ${c.arrival_note} »)` : ''}.</span>}
                {c.status === 'done' && notDone.length > 0 && <span style={{ display: 'block' }}>{notDone.length} tâche{notDone.length > 1 ? 's' : ''} non cochée{notDone.length > 1 ? 's' : ''} : {notDone.map((k) => k.label).join(', ')}.</span>}
                {c.status === 'done' && noPhoto.length > 0 && <span style={{ display: 'block' }}>Photo manquante : {noPhoto.map((k) => k.label).join(', ')}.</span>}
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
                {c.checks.length > 0 && <li className="row between"><span className="muted">Tâches faites</span><b style={notDone.length ? { color: 'var(--gold)' } : {}}>{c.checks.filter((k) => k.checked).length} / {c.checks.length}</b></li>}
                <li className="row between"><span className="muted">Photos</span><b>{c.photos.length}</b></li>
                <li className="row between"><span className="muted">Vidéos</span><b>{(c.videos || []).length}</b></li>
              </ul>
              {c.host_note && <div className="callout" style={{ marginBottom: 0 }}><b>Ta consigne</b><span style={{ whiteSpace: 'pre-line' }}>{c.host_note}</span></div>}
              {c.notes && !c.has_remarks && <div className="callout" style={{ marginBottom: 0 }}><b>Commentaire du personnel</b>{c.notes}</div>}
              <div className="row wrap-row" style={{ marginTop: 14 }}>
                {c.checks.length > 0 && <a className="btn primary small" href={`/api/host/cleanings/${c.id}/pdf`} target="_blank" rel="noopener">Ouvrir le rapport PDF</a>}
                {!concierge && c.status === 'done' && <button className="small" onClick={reopen}>Rouvrir</button>}
              </div>
            </div>

            {c.arrival_done_at && (
              <section className="card">
                <div className="row between">
                  <h3 style={{ margin: 0 }}>État à l'arrivée</h3>
                  <span className="row" style={{ gap: 6, fontWeight: 600, color: stateInfo(c.arrival_state)?.color }}>
                    {stateInfo(c.arrival_state) && <Smiley color={stateInfo(c.arrival_state).color} mood={stateInfo(c.arrival_state).mood} size={26} />}
                    {stateLabel(c.arrival_state)}
                  </span>
                </div>
                {c.arrival_note && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-line' }}>« {c.arrival_note} »</p>}
                <p className="muted small" style={{ margin: '4px 0 10px' }}>Constaté le {fmtDateTime(c.arrival_done_at)}</p>
                {videos('arrivee', 'Vidéo du logement à l\'arrivée')}
                <div className="photo-grid">
                  {ARRIVAL_AREAS.flatMap((a) => arrivalPhotos.filter((p) => p.area === a.key).map((p) => <Photo key={p.id} p={p} title={a.label} />))}
                </div>
              </section>
            )}
            {c.checks.length > 0 && <h2>Checklist</h2>}
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
                        <span className="grow" style={{ paddingTop: 2 }}>
                          {k.label}
                          {!k.checked && c.status === 'done' && (k.required !== false
                            ? <span className="badge warn" style={{ marginLeft: 6 }}>Non fait</span>
                            : <span className="badge" style={{ marginLeft: 6 }}>Non cochée</span>)}
                        </span>
                        {k.checked_at && <span className="muted small" style={{ paddingTop: 3 }}>{fmtTime(k.checked_at)}</span>}
                      </div>
                      {ph.length > 0 && <div className="photo-grid" style={{ marginTop: 10 }}>{ph.map((p) => <Photo key={p.id} p={p} />)}</div>}
                    </div>
                  );
                })}
              </section>
            ))}
            {c.status !== 'planned' && c.arrival_done_at && (
              <section className="card">
                <h3>Après le ménage</h3>
                {videos('menage', 'Vidéo du logement après le ménage')}
              </section>
            )}
            {general.length > 0 && (
              <section className="card">
                <h3>Autres photos (problèmes signalés)</h3>
                <div className="photo-grid">{general.map((p) => <Photo key={p.id} p={p} />)}</div>
              </section>
            )}
            {zoom && <div className="lightbox" onClick={() => setZoom(null)}><div className="stamp-wrap"><img src={zoom.url} alt="" /><span className="stamp big">{fmtDateTime(zoom.received_at)}</span></div><a className="btn small" style={{ position: 'absolute', top: 14, right: 14 }} href={`/api/host/media/${zoom.id}`} download onClick={(e) => e.stopPropagation()}><IconDownload /> Télécharger</a></div>}
          </>
        );
      })()}
    </HostPage>
  );
}
