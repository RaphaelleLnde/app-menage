'use client';
import Link from 'next/link';
import { useHostData, HostPage } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { STATUS, fmtDay, fmtTime, fmtDuration } from '@/app/components/client-utils';

export default function History() {
  const host = useHostData('/api/host/overview');
  const d = host.data;
  return (
    <HostPage host={host}>
      {d && (
        <>
          <Back />
          <h1 className="title"><span className="script">Déjà fait</span>Historique</h1>
          <p className="lead">Touchez un ménage pour voir la checklist, les photos et télécharger le PDF.</p>
          {d.history.length === 0 && <p className="muted" style={{ marginTop: 20 }}>Aucun ménage réalisé pour l'instant.</p>}
          {d.history.map((c) => (
            <Link key={c.id} href={`/admin/c/${c.id}`} className="card">
              <div className="row between">
                <b>{fmtDay(c.date, d.today)}</b>
                {c.has_remarks && !c.remarks_seen ? <span className="badge warn">Remarques à vérifier</span> : <span className={`badge ${c.status}`}>{STATUS[c.status]}</span>}
              </div>
              <div className="muted small" style={{ marginTop: 4 }}>
                N° {c.number} · {c.completed_by || c.cleaner_name}
                {c.status === 'done' && <> · {fmtTime(c.started_at)} à {fmtTime(c.completed_at)} ({fmtDuration(c.started_at, c.completed_at)})</>}
              </div>
              {c.notes && <div className="callout small" style={{ margin: '10px 0 0' }}>{c.notes}</div>}
            </Link>
          ))}
        </>
      )}
    </HostPage>
  );
}
