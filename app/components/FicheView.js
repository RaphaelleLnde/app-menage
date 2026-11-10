'use client';
import { fmtD } from '@/app/components/fiches-client';

// Enfant rangé sur la fiche de son parent (ou sur la première fiche si le parent n'est pas indiqué)
const parentOf = (f, c) => Math.max(0, f.travellers.findIndex((x) => `${x.first_names} ${x.last_name}`.trim() === c.parent));

// Contenu d'une fiche de police (page dédiée et carte de réservation)
export default function FicheView({ f }) {
  return (
    <>
      {f.all_french && <div className="fiche"><p style={{ margin: 0 }}>Le voyageur a déclaré que <b>tous les voyageurs sont de nationalité française</b> : pas de fiche individuelle de police à remplir.</p></div>}
      {f.travellers.map((t, i) => (
        <div key={i} className="fiche">
          <h3>Fiche individuelle de police · voyageur {i + 1}</h3>
          <dl>
            <dt>Nom</dt><dd>{t.last_name.toUpperCase()}</dd>
            <dt>Prénom(s)</dt><dd>{t.first_names}</dd>
            <dt>Né(e) le</dt><dd>{fmtD(t.birth_date)}</dd>
            <dt>À</dt><dd>{t.birth_place}</dd>
            <dt>Nationalité</dt><dd>{t.nationality}</dd>
            <dt>Domicile habituel</dt><dd>{t.address}</dd>
            <dt>Téléphone portable</dt><dd>{t.phone}</dd>
            <dt>E-mail</dt><dd>{t.email}</dd>
            <dt>Date d'arrivée</dt><dd>{fmtD(f.arrival)}</dd>
            <dt>Date de départ prévue</dt><dd>{fmtD(f.departure)}</dd>
          </dl>
          {f.children.filter((c) => parentOf(f, c) === i).length > 0 && (
            <>
              <p className="small" style={{ margin: '12px 0 4px', fontWeight: 600 }}>Enfants de moins de 15 ans accompagnants</p>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {f.children.filter((c) => parentOf(f, c) === i)
                  .map((c, j) => <li key={j}>{c.last_name.toUpperCase()} {c.first_names}{c.birth_date ? `, né(e) le ${fmtD(c.birth_date)}` : ''}</li>)}
              </ul>
            </>
          )}
          <p className="small" style={{ margin: '12px 0 0' }}>Signature du voyageur :</p>
          {f.signatures?.[i] ? <img className="sig" src={f.signatures[i]} alt="Signature" /> : <p className="muted small">-</p>}
        </div>
      ))}
    </>
  );
}
