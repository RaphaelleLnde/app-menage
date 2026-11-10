'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useHostData, HostPage, useRole } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { IconLeft, IconRight } from '@/app/components/icons';
import { STATUS, fmtDay } from '@/app/components/client-utils';
import Horaires from '@/app/components/Horaires';
import { IconCopy } from '@/app/components/icons';
import { stateInfo, stateLabel } from '@/lib/arrival';
import { buildReview } from '@/lib/review';
import Smiley from '@/app/components/Smiley';
import { formsFor, guestUrl, copyText as copyLink } from '@/app/components/fiches-client';
import FicheView from '@/app/components/FicheView';

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
  // Fiches de police (hôte uniquement)
  const [fiches, setFiches] = useState(null);
  useEffect(() => {
    if (concierge !== false) return;
    fetch(`/api/host/fiches?from=${addDays(gridStart, -60)}&to=${gridEnd}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then(setFiches).catch(() => {});
  }, [gridStart, gridEnd, concierge]);
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
                    {showLabel && <em className="mlabel" style={{ left: start ? '50%' : 0, width: `calc(${(span - (start ? 0.5 : 0)) * 100}% + ${Math.floor(span)}px)` }}>{fiches && <i className={`fdot ${formsFor(s, fiches.forms).length ? 'fd-ok' : 'fd-no'}`} />}{s.guest_name || pf.label}</em>}
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
        {fiches && <span><i className="fdot fd-ok" />Fiche de police reçue</span>}
        {fiches && <span><i className="fdot fd-no" />Pas encore</span>}
      </div>
      {!concierge && <Link href="/admin/fiches" className="btn small" style={{ marginTop: 8, marginRight: 8 }}>Fiches de police et lien voyageurs</Link>}
      {month !== today.slice(0, 7) && <button className="small ghost" style={{ marginTop: 6 }} onClick={() => setMonth(today.slice(0, 7))}>Revenir à ce mois-ci</button>}

      {sel && (
        <>
          <h2>{fmtDay(sel, today)}</h2>
          {selStays.length === 0 && <p className="muted">Logement libre ce jour-là.</p>}
          {selStays.map((s) => <StayCard key={s.id} s={s} sel={sel} today={today} concierge={concierge} reload={host.reload} fiches={fiches} />)}
        </>
      )}
    </HostPage>
  );
}

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    // Repli pour les navigateurs qui refusent l'accès au presse-papiers
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

// Commentaire d'évaluation proposé à partir de l'état des lieux du ménage de départ
function ReviewBox({ s }) {
  const [lang, setLang] = useState('fr');
  const base = buildReview(s, lang);
  const [text, setText] = useState(base?.text || '');
  const [priv, setPriv] = useState(base?.privateNote || '');
  const [copied, setCopied] = useState('');
  useEffect(() => { const r = buildReview(s, lang); setText(r?.text || ''); setPriv(r?.privateNote || ''); }, [lang, s.arrival_state, s.arrival_note]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!base) return null;
  const si = stateInfo(s.arrival_state);
  const copy = async (t, what) => { if (await copyText(t)) { setCopied(what); setTimeout(() => setCopied(''), 2500); } };
  return (
    <div className="review">
      <div className="row between wrap-row">
        <b>Évaluer le voyageur</b>
        <div className="seg" style={{ margin: 0 }}>
          <button className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>Français</button>
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
        </div>
      </div>
      <p className="small" style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        {si && <Smiley color={si.color} mood={si.mood} size={18} />}
        Logement rendu : <b>{stateLabel(s.arrival_state).toLowerCase()}</b>{s.arrival_note ? ` (« ${s.arrival_note} »)` : ''}
      </p>
      <label className="field" style={{ marginBottom: 6 }}>
        <span>Commentaire public</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <button className="small primary" onClick={() => copy(text, 'pub')}><IconCopy /> {copied === 'pub' ? 'Copié !' : 'Copier le commentaire'}</button>
      {priv && (
        <label className="field" style={{ margin: '12px 0 6px' }}>
          <span>Message privé au voyageur (facultatif)</span>
          <textarea style={{ minHeight: 80 }} value={priv} onChange={(e) => setPriv(e.target.value)} />
        </label>
      )}
      {priv && <button className="small" onClick={() => copy(priv, 'priv')}><IconCopy /> {copied === 'priv' ? 'Copié !' : 'Copier le message privé'}</button>}
      <p className="stars">{base.allFive
        ? <>Notes conseillées : <b>5 ★ partout</b> (propreté, communication, respect du règlement) · recommander : oui.</>
        : <>Notes conseillées : propreté {'★'.repeat(base.cleanliness)}{'☆'.repeat(5 - base.cleanliness)} · communication et respect du règlement à ton avis · recommander : {base.recommend ? 'oui' : 'non'}.</>}</p>
    </div>
  );
}

// Fiche de police du séjour : complétée, voyageurs français, ou pas encore remplie.
// La fiche s'affiche directement dans la carte de la réservation.
function FicheStatus({ s, fiches }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(null); // fiches complètes (avec signatures)
  if (!fiches) return null;
  const list = formsFor(s, fiches.forms);
  const nb = list.reduce((n, f) => n + f.travellers.length, 0);
  const toggle = async () => {
    if (!open && !full) {
      const rows = await Promise.all(list.map((f) => fetch(`/api/host/fiches/${f.id}`, { cache: 'no-store' }).then((r) => r.json())));
      setFull(rows);
    }
    setOpen(!open);
  };
  return (
    <div className="fbox">
      <div className="row between wrap-row" style={{ gap: 8 }}>
        <span className="small" style={{ fontWeight: 600 }}>Fiche de police</span>
        {list.length === 0 ? <span className="fstat fs-no">Pas encore remplie</span>
          : nb > 0 ? <span className="fstat fs-ok">Complétée · {nb} voyageur{nb > 1 ? 's' : ''} étranger{nb > 1 ? 's' : ''}</span>
          : <span className="fstat fs-ok">Voyageurs français, rien à faire</span>}
      </div>
      {list.length === 0 ? (
        <div className="row wrap-row" style={{ marginTop: 8 }}>
          <button className="small" onClick={async () => { if (await copyLink(guestUrl(fiches))) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}><IconCopy /> {copied ? 'Lien copié' : 'Copier le lien à envoyer'}</button>
        </div>
      ) : (
        <>
          <p className="muted small" style={{ margin: '4px 0 0' }}>Remplie par {list.map((f) => f.lead_name + (f.lead_phone ? ` (${f.lead_phone})` : '')).join(', ')}</p>
          <div className="row wrap-row" style={{ marginTop: 8 }}>
            <button className="small" onClick={toggle}>{open ? 'Masquer la fiche' : 'Voir la fiche'}</button>
            {list.map((f) => <a key={f.id} className="btn small ghost" href={`/admin/fiches/${f.id}`} target="_blank" rel="noopener">Imprimer / PDF</a>)}
          </div>
          {open && full && full.map((f) => <FicheView key={f.id} f={f} />)}
        </>
      )}
    </div>
  );
}

function StayCard({ s, sel, today, concierge, reload, fiches }) {
  const pfKey = platformOf(s);
  const pf = PLATFORM[pfKey];
  const n = diffDays(s.checkin_date, s.date);
  const [out, setOut] = useState(s.checkout_time || '');
  const [inn, setInn] = useState(s.checkin_time || '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = out !== (s.checkout_time || '') || inn !== (s.checkin_time || '');

  const patch = async (body) => {
    const r = await fetch(`/api/host/cleanings/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return [r.ok, await r.json()];
  };
  const saveMemo = async (v) => {
    if ((s.host_memo || '') === v.trim()) return;
    await patch({ host_memo: v });
    reload();
  };
  const saveTimes = async (notify) => {
    setBusy(true); setMsg('');
    const [ok, d] = await patch({ checkout_time: out || null, checkin_time: inn || null, notify_concierge: notify });
    setBusy(false);
    if (!ok) { setMsg(d.error || 'Erreur'); return; }
    setMsg(notify ? (d.notified ? 'Enregistré, la conciergerie a été prévenue.' : 'Enregistré (rien de nouveau à signaler).') : 'Enregistré : visible par le personnel et la conciergerie.');
    reload();
  };

  return (
    <div className="card">
      <div className="row between">
        <span className={`badge ${pf.cls}`}>{pf.label}</span>
        <span className="small muted">
          {s.checkin_date === sel ? 'Arrivée ce jour' : s.date === sel ? 'Départ ce jour' : 'En cours de séjour'}
        </span>
      </div>
      {s.guest_name && (
        <p style={{ margin: '10px 0 0' }}>
          <b>{s.guest_name}</b>
          {!concierge && s.guest_phone && <> · <a href={`tel:${s.guest_phone.replace(/[^+\d]/g, '')}`}>{s.guest_phone}</a></>}
        </p>
      )}
      <p style={{ margin: s.guest_name ? '2px 0 0' : '10px 0 0', fontWeight: 600 }}>Du {short(s.checkin_date)} au {short(s.date)}</p>
      <p className="muted small" style={{ margin: '2px 0 0' }}>
        {n} nuit{n > 1 ? 's' : ''}
        {!concierge && s.resa_code && <> · Réservation {s.resa_code}</>}
        {!concierge && s.guest_phone4 && <> · Tél. ••• {s.guest_phone4}</>}
      </p>

      {concierge ? (
        <Horaires late={s.checkout_time} early={s.checkin_time} style={{ marginTop: 10 }} />
      ) : (
        <div style={{ marginTop: 12 }}>
          <span className="field-label">Horaires particuliers</span>
          <div className="time-row">
            <label className="field" style={{ margin: 0 }}>
              <span className="small">Arrivée anticipée, le {short(s.checkin_date)}</span>
              <input type="time" value={inn} onChange={(e) => setInn(e.target.value)} />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="small">Départ tardif, le {short(s.date)}</span>
              <input type="time" value={out} onChange={(e) => setOut(e.target.value)} />
            </label>
          </div>
          {changed && (
            <div className="row wrap-row" style={{ marginTop: 8 }}>
              <button className="small primary" onClick={() => saveTimes(true)} disabled={busy}>Enregistrer et prévenir la conciergerie</button>
              <button className="small" onClick={() => saveTimes(false)} disabled={busy}>Enregistrer seulement</button>
            </div>
          )}
          {msg && <p className="small" style={{ margin: '6px 0 0', color: 'var(--ok)' }}>{msg}</p>}
        </div>
      )}

      {!concierge && <FicheStatus s={s} fiches={fiches} />}

      {!concierge && (
        <label className="field" style={{ margin: '12px 0 6px' }}>
          <span>Mes remarques sur ce séjour</span>
          <textarea key={s.id + (s.host_memo || '')} defaultValue={s.host_memo || ''} style={{ minHeight: 70 }}
            placeholder="Pour toi seulement : comment ça s'est passé, échanges avec le voyageur, à retenir…"
            onBlur={(e) => saveMemo(e.target.value)} />
        </label>
      )}

      {!concierge && s.date <= today && (s.arrival_done_at
        ? <ReviewBox s={s} />
        : <p className="muted small" style={{ margin: '10px 0' }}>Le commentaire d'évaluation sera proposé ici quand l'état des lieux du ménage de départ sera fait.</p>)}

      <div className="row wrap-row" style={{ marginTop: 10 }}>
        {!concierge && pfKey === 'airbnb' && s.resa_code && <a className="btn small" href={`https://www.airbnb.fr/hosting/reservations/details/${s.resa_code}`} target="_blank" rel="noreferrer">Voir sur Airbnb</a>}
        {!concierge && pfKey === 'booking' && <a className="btn small" href="https://admin.booking.com/" target="_blank" rel="noreferrer">Ouvrir l'extranet Booking</a>}
        <Link className="btn small ghost" href={s.status === 'done' || s.status === 'in_progress' ? `/admin/c/${s.id}` : '/admin/calendrier'}>Ménage du {short(s.date)} : {STATUS[s.status].toLowerCase()}</Link>
      </div>
    </div>
  );
}
