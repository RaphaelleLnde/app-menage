'use client';
import Link from 'next/link';
import { useHostData, HostPage } from '@/app/components/host';
import { PROPERTY } from '@/app/components/TopBar';
import { IconCalendar, IconHistory, IconList, IconSettings, IconBed, IconBroom } from '@/app/components/icons';
import { fmtDay, fmtTime, fmtDateTime, turnoverLabel } from '@/app/components/client-utils';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export default function AdminHome() {
  const host = useHostData('/api/host/overview');
  const d = host.data;
  return (
    <HostPage host={host}>
      {d && <Home d={d} />}
    </HostPage>
  );
}

function Home({ d }) {
  const active = d.upcoming.filter((c) => c.status !== 'cancelled');
  const current = active.find((c) => c.status === 'in_progress');
  const next = current || active[0];
  const in7 = active.filter((c) => c.date <= addDays(d.today, 6)).length;
  const last = d.history.find((c) => c.status === 'done');
  const concierge = d.role === 'concierge';
  const toCheck = d.history.filter((c) => c.status === 'done' && c.has_remarks && !c.remarks_seen);

  return (
    <>
      <div className="hero">
        <p className="le">{concierge ? 'Conciergerie' : 'Ménages'}</p>
        <h1>{PROPERTY}</h1>
      </div>
      <div className="band">
        <p className="script">Bonjour</p>
        <p>{current ? `Ménage en cours : ${current.cleaner_name}, depuis ${fmtTime(current.started_at)}.` : in7 ? `${in7} ménage${in7 > 1 ? 's' : ''} prévu${in7 > 1 ? 's' : ''} dans les 7 prochains jours.` : 'Aucun ménage prévu cette semaine.'}</p>
      </div>

      {toCheck.length > 0 && (
        <Link href={`/admin/c/${toCheck[0].id}`} className="alert">
          <b>Remarques à vérifier</b>
          <span>{toCheck.length === 1 ? `${toCheck[0].completed_by} a laissé une remarque (ménage du ${fmtDay(toCheck[0].date, d.today).toLowerCase()}).` : `${toCheck.length} ménages ont des remarques à vérifier.`}</span>
        </Link>
      )}

      {next && (
        <Link href={`/admin/c/${next.id}`} className="next">
          <div className="cal"><b>{Number(next.date.slice(8))}</b><span>{MONTHS[Number(next.date.slice(5, 7)) - 1]}</span></div>
          <div>
            <div className="k">{next.status === 'in_progress' ? 'En cours' : 'Prochain ménage'}</div>
            <div className="t">{fmtDay(next.date, d.today)}</div>
            {turnoverLabel(next) && <em>{turnoverLabel(next)}</em>}
          </div>
        </Link>
      )}

      <div className="tiles">
        <Link href="/admin/reservations" className="tile wide">
          <div className="ic"><IconBed /></div>
          <div><b>Réservations</b><span>Le mois : Airbnb et Booking, voyageurs</span></div>
        </Link>
        <Link href="/admin/calendrier" className="tile">
          <div className="ic"><IconCalendar /></div>
          <b>Ménages</b>
          <span>La semaine : ménages à faire, consignes</span>
        </Link>
        <Link href="/admin/historique" className="tile">
          <div className="ic"><IconHistory /></div>
          <b>Historique</b>
          <span>{last ? `Dernier : ${fmtDay(last.date, d.today).toLowerCase()}, ${last.completed_by}` : 'Ménages réalisés, photos, PDF'}</span>
        </Link>
        {concierge ? (
          <a href={d.staffPath || '#'} className="tile wide">
            <div className="ic"><IconBroom /></div>
            <div><b>Faire un ménage</b><span>Le parcours ménage : checklist et photos</span></div>
          </a>
        ) : (
        <Link href="/admin/checklist" className="tile">
          <div className="ic"><IconList /></div>
          <b>Checklist</b>
          <span>{d.checklistCount} tâches dans {d.checklistRooms} pièces</span>
        </Link>
        )}
        <Link href="/admin/reglages" className={`tile ${concierge ? 'wide' : ''}`}>
          <div className="ic"><IconSettings /></div>
          {concierge
            ? <div><b>Notifications</b><span>Être prévenue à la fin des ménages</span></div>
            : <><b>Réglages</b><span>Liens, notifications, boîte à clés</span></>}
        </Link>
      </div>

      {d.lastSync && <footer className="foot">Calendriers lus le {fmtDateTime(d.lastSync.at)}</footer>}
    </>
  );
}

function addDays(iso, n) {
  const x = new Date(iso + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
