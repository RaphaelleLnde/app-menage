'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useHostData, HostPage, useRole } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { IconLeft, IconRight } from '@/app/components/icons';
import { STATUS, fmtDay } from '@/app/components/client-utils';

const DN = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const PLATFORM = {
  airbnb: { label: 'Airbnb', cls: 'pf-airbnb' },
  booking: { label: 'Booking', cls: 'pf-booking' },
};

function addDays(iso, n) {
  const x = new Date(iso + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
function diffDays(a, b) {
  return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
}
function parisToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function monthLabel(m) {
  const s = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(m + '-01T00:00:00Z'));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function shiftMonth(m, n) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
const short = (iso) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso + 'T00:00:00Z'));
const platformOf = (c) => ((c.ical_uid || '').startsWith('booking:') ? 'booking' : 'airbnb');

export default function Reservations() {
  const [month, setMonth] = useState(() => parisToday().slice(0, 7));
  const [sel, setSel] = useState(null);
  const concierge = useRole() === 'concierge';
  const first = `${month}-01`;
  const lastDay = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const gridStart = addDays(first, -((new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const gridEnd = addDays(lastDay, (7 - ((new Date(lastDay + 'T12:00:00Z').getUTCDay() + 6) % 7) - 1));
  const host = useHostData(`/api/host/cleanings?from=${gridStart}&to=${gridEnd}`);
  const d = host.data;
  const today = d?.today || parisToday();

  const days = useMemo(() => {
    const out = [];
    for (let x = gridStart; x <= gridEnd; x = addDays(x, 1)) out.push(x);
    return out;
  }, [gridStart, gridEnd]);

  const stays = (d?.cleanings || []).filter((c) => c.source === 'ical' && c.checkin_date && !c.resa_gone && c.checkin_date <= gridEnd);
  const staysOn = (day) => stays.filter((s) => s.checkin_date <= day && s.date >= day);

  // Statistiques du mois : nuits réservées (une nuit = du jour J au lendemain)
  const nightsIn = (s) => Math.max(0, diffDays(s.checkin_date < first ? first : s.checkin_date, s.date > addDays(lastDay, 1) ? addDays(lastDay, 1) : s.date));
  const monthStays = stays.filter((s) => nightsIn(s) > 0);
  const nights = monthStays.reduce((n, s) => n + nightsIn(s), 0);
  const nbDays = diffDays(first, lastDay) + 1;

  useEffect(() => {
    if (!d) return;
    if (sel && sel.slice(0, 7) === month) return;
    setSel(today.slice(0, 7) === month ? today : first);
  }, [d, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveName = async (c, name) => {
    if ((c.guest_name || '') === name.trim()) return;
    await fetch(`/api/host/cleanings/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guest_name: name }) });
    host.reload();
  };

  const selStays = sel ? staysOn(sel) : [];

  return (
    <HostPage host={host}>
      <Back />
      <h1 className="title"><span className="script">Le mois</span>Réservations</h1>
      <p className="lead">{monthStays.length} réservation{monthStays.length > 1 ? 's' : ''} · {nights} nuit{nights > 1 ? 's' : ''} sur {nbDays} · occupation {Math.round((nights / nbDays) * 100)} %</p>

      <div className="weeknav">
        <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent"><IconLeft /></button>
        <b>{monthLabel(month)}</b>
        <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mois suivant"><IconRight /></button>
      </div>

      <div className="month">
        {DN.map((x, i) => <span key={i} className="mdn">{x}</span>)}
        {days.map((day, i) => {
          const out = day.slice(0, 7) !== month;
          const col = i % 7;
          return (
            <div key={day} role="button" tabIndex={out ? -1 : 0} className={`mday ${out ? 'out' : ''} ${day === today ? 'today' : ''} ${day === sel ? 'sel' : ''}`}
              onClick={() => !out && setSel(day)} onKeyDown={(e) => e.key === 'Enter' && !out && setSel(day)}>
              <span className="mdd">{Number(day.slice(8))}</span>
              {staysOn(day).map((s) => {
                const pf = PLATFORM[platformOf(s)];
                const start = s.checkin_date === day;
                const end = s.date === day;
                // Le nom s'affiche au début du séjour, et en début de ligne si le séjour continue
                const showLabel = !end && (start || col === 0);
                const span = Math.min(7 - col, diffDays(day, s.date) + 0.5); // cases jusqu'au milieu du jour de départ, ou fin de ligne
                return (
                  <span key={s.id}>
                    <span className={`mbar ${pf.cls} ${start ? 'start' : ''} ${end ? 'end' : ''}`} />
                    {showLabel && <em className="mlabel" style={{ left: start ? '50%' : 0, width: `calc(${(span - (start ? 0.5 : 0)) * 100}% + ${Math.floor(span)}px)` }}>{s.guest_name || pf.label}</em>}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--airbnb)' }} />Airbnb</span>
        <span><i style={{ background: 'var(--booking)' }} />Booking</span>
      </div>
      {month !== today.slice(0, 7) && <button className="small ghost" style={{ marginTop: 6 }} onClick={() => setMonth(today.slice(0, 7))}>Revenir à ce mois-ci</button>}

      {sel && (
        <>
          <h2>{fmtDay(sel, today)}</h2>
          {selStays.length === 0 && <p className="muted">Logement libre ce jour-là.</p>}
          {selStays.map((s) => {
            const pfKey = platformOf(s);
            const pf = PLATFORM[pfKey];
            const n = diffDays(s.checkin_date, s.date);
            return (
              <div key={s.id} className="card">
                <div className="row between">
                  <span className={`badge ${pf.cls}`}>{pf.label}</span>
                  <span className="small muted">
                    {s.checkin_date === sel ? 'Arrivée ce jour' : s.date === sel ? 'Départ ce jour' : 'En cours de séjour'}
                  </span>
                </div>
                <p style={{ margin: '10px 0 0', fontWeight: 600 }}>Du {short(s.checkin_date)} au {short(s.date)}</p>
                <p className="muted small" style={{ margin: '2px 0 0' }}>
                  {n} nuit{n > 1 ? 's' : ''}
                  {!concierge && s.resa_code && <> · Réservation {s.resa_code}</>}
                  {!concierge && s.guest_phone4 && <> · Tél. ••• {s.guest_phone4}</>}
                </p>
                {concierge ? (s.guest_name && <p style={{ margin: '8px 0' }}>Voyageur : <b>{s.guest_name}</b></p>) : (
                <label className="field" style={{ marginBottom: 6 }}>
                  <span>Voyageur</span>
                  <input key={s.id + (s.guest_name || '')} type="text" defaultValue={s.guest_name || ''} placeholder="Nom du voyageur (à saisir)"
                    onBlur={(e) => saveName(s, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
                </label>
                )}
                <div className="row wrap-row">
                  {!concierge && pfKey === 'airbnb' && s.resa_code && <a className="btn small" href={`https://www.airbnb.fr/hosting/reservations/details/${s.resa_code}`} target="_blank" rel="noreferrer">Voir sur Airbnb</a>}
                  {!concierge && pfKey === 'booking' && <a className="btn small" href="https://admin.booking.com/" target="_blank" rel="noreferrer">Ouvrir l'extranet Booking</a>}
                  <Link className="btn small ghost" href={s.status === 'done' || s.status === 'in_progress' ? `/admin/c/${s.id}` : '/admin/calendrier'}>Ménage du {short(s.date)} : {STATUS[s.status].toLowerCase()}</Link>
                </div>
              </div>
            );
          })}
          {!concierge && <p className="muted small" style={{ marginTop: 16 }}>Airbnb et Booking ne transmettent pas le nom des voyageurs dans leurs calendriers : tu peux le saisir ici, il sera retenu.</p>}
        </>
      )}
    </HostPage>
  );
}
