'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useHostData, HostPage, useRole } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { IconBroom, IconLeft, IconRight } from '@/app/components/icons';
import ConsignesSheet from '@/app/components/ConsignesSheet';
import { STATUS, fmtDay, fmtTime } from '@/app/components/client-utils';
import Horaires from '@/app/components/Horaires';
import { cleaningTimes, fmtHour } from '@/lib/horaires';

const DN = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function addDays(iso, n) {
  const x = new Date(iso + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
function mondayOf(iso) {
  const x = new Date(iso + 'T12:00:00Z');
  return addDays(iso, -((x.getUTCDay() + 6) % 7));
}
function parisToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function weekLabel(start) {
  const end = addDays(start, 6);
  const f = (iso, opts) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts }).format(new Date(iso + 'T00:00:00Z'));
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return sameMonth
    ? `${Number(start.slice(8))} au ${f(end, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : `${f(start, { day: 'numeric', month: 'long' })} au ${f(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export default function Calendar() {
  const [week, setWeek] = useState(() => mondayOf(parisToday()));
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState('');
  const [consignes, setConsignes] = useState(null); // ménage dont on modifie les consignes
  const concierge = useRole() === 'concierge';
  const host = useHostData(`/api/host/cleanings?from=${week}&to=${addDays(week, 6)}`);
  const d = host.data;
  const today = d?.today || parisToday();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);

  const cleanings = d?.cleanings || [];
  const stays = cleanings.filter((c) => c.checkin_date && !c.resa_gone);
  const onDay = (day) => cleanings.filter((c) => c.date === day);
  const staysOn = (day) => stays.filter((s) => s.checkin_date <= day && s.date >= day);

  // Jour sélectionné par défaut : aujourd'hui, sinon le premier jour avec un ménage
  useEffect(() => {
    if (!d) return;
    if (sel && days.includes(sel)) return;
    setSel(days.includes(today) ? today : days.find((x) => onDay(x).length) || days[0]);
  }, [d, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (id, body) => {
    setMsg('');
    const r = await fetch(`/api/host/cleanings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) setMsg((await r.json()).error || 'Erreur');
    host.reload();
  };
  const add = async (date) => {
    await fetch('/api/host/cleanings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date }) });
    host.reload();
  };

  const arrivals = sel ? stays.filter((s) => s.checkin_date === sel) : [];
  const selCleanings = sel ? onDay(sel) : [];
  const weekCount = days.reduce((n, x) => n + onDay(x).filter((c) => c.status !== 'cancelled').length, 0);

  return (
    <HostPage host={host}>
      <Back />
      <h1 className="title"><span className="script">La semaine</span>Ménages</h1>
      <p className="lead">{weekCount ? `${weekCount} ménage${weekCount > 1 ? 's' : ''} cette semaine.` : 'Aucun ménage cette semaine.'}</p>

      <div className="weeknav">
        <button onClick={() => setWeek(addDays(week, -7))} aria-label="Semaine précédente"><IconLeft /></button>
        <b>{weekLabel(week)}</b>
        <button onClick={() => setWeek(addDays(week, 7))} aria-label="Semaine suivante"><IconRight /></button>
      </div>

      <div className="week">
        {days.map((day, i) => {
          const cs = onDay(day);
          const main = cs.find((c) => c.status !== 'cancelled') || cs[0];
          return (
            <button key={day} className={`day ${day === today ? 'today' : ''} ${day === sel ? 'sel' : ''} ${day < today ? 'past' : ''}`} onClick={() => setSel(day)}>
              <span className="dn">{DN[i]}</span>
              <span className="dd">{Number(day.slice(8))}</span>
              {staysOn(day).map((s) => (
                <span key={s.id} className={`stay ${s.checkin_date === day ? 'start' : ''} ${s.date === day ? 'end' : ''}`} />
              ))}
              {main && <span className={`mk ${main.status}`} title={STATUS[main.status]}><IconBroom className="" /></span>}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="bar" />Séjour</span>
        <span><i style={{ background: 'var(--gold)' }} />À faire</span>
        <span><i style={{ background: 'var(--blue)' }} />En cours</span>
        <span><i style={{ background: 'var(--ok)' }} />Terminé</span>
      </div>
      {week !== mondayOf(today) && <button className="small ghost" style={{ marginTop: 6 }} onClick={() => setWeek(mondayOf(today))}>Revenir à cette semaine</button>}

      {msg && <div className="error">{msg}</div>}

      {sel && (
        <>
          <h2>{fmtDay(sel, today)}</h2>
          {selCleanings.length === 0 && arrivals.length === 0 && <p className="muted">Rien de prévu ce jour-là.</p>}
          {selCleanings.map((c) => (
            <div key={c.id} className="card">
              <div className="row between">
                <h3 style={{ margin: 0 }}>Ménage</h3>
                <span className={`badge ${c.status}`}>{STATUS[c.status]}</span>
              </div>
              <p className="muted small" style={{ margin: '6px 0 0' }}>
                {c.source === 'ical' ? `${(c.ical_uid || '').startsWith('booking:') ? 'Booking' : 'Airbnb'} · départ des voyageurs arrivés ${fmtDay(c.checkin_date, today).toLowerCase()}` : 'Ajouté à la main'}
                {c.next_checkin === c.date && <><br /><b style={{ color: 'var(--gold)' }}>Nouveaux voyageurs le jour même</b></>}
              </p>
              {(() => { const t = cleaningTimes(c, cleanings); return <Horaires late={t.late_checkout} early={t.early_checkin} style={{ marginTop: 10 }} />; })()}
              {c.status === 'in_progress' && <p className="small" style={{ margin: '6px 0 0' }}>{c.cleaner_name}, depuis {fmtTime(c.started_at)}</p>}
              {(c.host_note || (c.extra_tasks || []).length > 0) && (
                <div className="callout small" style={{ margin: '10px 0 0' }}>
                  <b>Consigne</b>
                  {c.host_note && <span style={{ whiteSpace: 'pre-line' }}>{c.host_note}</span>}
                  {(c.extra_tasks || []).length > 0 && <span className="muted" style={{ display: 'block' }}>+ {c.extra_tasks.length} point{c.extra_tasks.length > 1 ? 's' : ''} ajouté{c.extra_tasks.length > 1 ? 's' : ''} à la checklist</span>}
                </div>
              )}
              {c.status === 'done' && <p className="small" style={{ margin: '6px 0 0' }}>Fait par {c.completed_by}, terminé à {fmtTime(c.completed_at)}</p>}
              <div className="row wrap-row" style={{ marginTop: 10 }}>
                {c.status !== 'planned' && c.status !== 'cancelled' && <Link className="btn small primary" href={`/admin/c/${c.id}`}>Voir le détail</Link>}
                {(c.status === 'planned' || c.status === 'in_progress') && d.staffPath && <a className="btn small primary" href={`${d.staffPath}/c/${c.id}`}>{c.status === 'planned' ? 'Faire ce ménage' : 'Ouvrir le ménage'}</a>}
                {!concierge && (c.status === 'planned' || c.status === 'in_progress') && <button className="small" onClick={() => setConsignes(c)}>{c.host_note || (c.extra_tasks || []).length ? 'Modifier la consigne' : 'Ajouter une consigne'}</button>}
                {!concierge && c.status === 'planned' && <button className="small" onClick={() => confirm('Annuler ce ménage ?') && patch(c.id, { status: 'cancelled' })}>Annuler</button>}
                {!concierge && c.status === 'cancelled' && <button className="small" onClick={() => patch(c.id, { status: 'planned' })}>Rétablir</button>}
                {!concierge && c.status === 'planned' && (
                  <label className="btn small" style={{ position: 'relative' }}>
                    Déplacer
                    <input type="date" defaultValue={c.date} style={{ position: 'absolute', inset: 0, opacity: 0 }}
                      onBlur={(e) => e.target.value && e.target.value !== c.date && patch(c.id, { date: e.target.value })} />
                  </label>
                )}
              </div>
            </div>
          ))}
          {arrivals.map((s) => (
            <div key={'a' + s.id} className="callout">
              <b>Arrivée de voyageurs</b>
              <span className="muted small">Séjour jusqu'au {fmtDay(s.date).toLowerCase()}{s.checkin_time && <>, <b style={{ color: 'var(--gold)' }}>arrivée anticipée à {fmtHour(s.checkin_time)}</b></>}</span>
            </div>
          ))}
          {!concierge && <button className="small" style={{ marginTop: 8 }} onClick={() => add(sel)}>+ Ajouter un ménage ce jour</button>}
        </>
      )}
      {consignes && <ConsignesSheet cleaning={consignes} title={fmtDay(consignes.date, today)} onClose={() => setConsignes(null)} onSaved={() => { setConsignes(null); setMsg(''); host.reload(); }} />}
    </HostPage>
  );
}
