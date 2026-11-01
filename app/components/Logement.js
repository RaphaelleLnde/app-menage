'use client';
import { useState } from 'react';

// Plan du 2e étage, repris du livret d'accueil
function Plan() {
  return (
    <svg viewBox="0 0 360 290" role="img" aria-label="Plan du 2e étage" style={{ display: 'block', width: '100%', height: 'auto' }}>
      <g fill="none" stroke="#23282D" strokeWidth="2.5"><path d="M4 104H14V30H197V104Z" /><path d="M197 104V0M291 0V36M291 74V104H197" /><path d="M0 200H197V275H291V200H197" /></g>
      <g stroke="#23282D" strokeWidth="1" fill="none" opacity=".5"><path d="M14 30L85 102M14 50L85 102M14 72L85 102M38 30L85 102M60 30L85 102" /><path d="M85 30V102M100 30V102M115 30V102M130 30V102" /></g>
      <path stroke="#23282D" strokeWidth="2.5" fill="none" d="M291 36L274 66" />
      <g stroke="#23282D" strokeWidth="2" fill="none"><rect x="222" y="212" width="40" height="56" /><path d="M242 212V268" /></g>
      <g stroke="#B87A2B" strokeWidth="2" fill="none" strokeDasharray="6 5"><path d="M44 106V156H330V60H298" /><path d="M242 158V198" /></g>
      <path fill="#B87A2B" d="M296 60l12-7v14z" />
      <path fill="#23282D" opacity=".75" transform="translate(-35,0)" d="M145 64l9-9h9v-9h9v-9h7v4h-4v9h-9v9h-9l-8 8z" />
      <text x="244" y="58" textAnchor="middle" fill="#1E3E8A" fontFamily="Allura,cursive" fontSize="26">Le Central</text>
      <text x="244" y="82" textAnchor="middle" fill="#646A72" fontFamily="Montserrat,Arial,sans-serif" fontSize="13" fontWeight="600">205</text>
      <text x="105" y="126" textAnchor="middle" fill="#646A72" fontFamily="Montserrat,Arial,sans-serif" fontSize="12">Escalier</text>
      <text x="110" y="242" textAnchor="middle" fill="#646A72" fontFamily="Montserrat,Arial,sans-serif" fontSize="12">Ascenseur</text>
    </svg>
  );
}

// Schéma des boîtes aux lettres du hall : celle du Central est tout en bas à gauche
function Mailboxes() {
  const W = 52, H = 40, G = 5;
  const box = (x, y, key, hl) => (
    <g key={key}>
      <rect x={x} y={y} width={W} height={H} rx="3" fill={hl ? '#1E3E8A' : '#FFFFFF'} stroke={hl ? '#1E3E8A' : '#BDB4A6'} strokeWidth="1.5" />
      <rect x={x + 8} y={y + 7} width={W - 16} height="4" rx="2" fill={hl ? '#F3EEE6' : '#23282D'} opacity={hl ? 0.9 : 0.75} />
      <circle cx={x + 9} cy={y + 20} r="2.6" fill="none" stroke={hl ? '#F3EEE6' : '#8A8F96'} strokeWidth="1.2" />
      <rect x={x + 16} y={y + 28} width="20" height="5" rx="1" fill={hl ? '#F3EEE6' : '#D8D1C4'} />
    </g>
  );
  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) cells.push(box(14 + c * (W + G), 14 + r * (H + G), `a${r}${c}`, r === 3 && c === 0));
    for (let c = 0; c < 2; c++) cells.push(box(205 + c * (W + G), 14 + r * (H + G), `b${r}${c}`, false));
  }
  return (
    <svg viewBox="0 0 340 250" role="img" aria-label="Boîtes aux lettres : celle du Central est tout en bas à gauche" style={{ display: 'block', width: '100%', height: 'auto' }}>
      <rect x="6" y="6" width="187" height="186" rx="4" fill="#E2DACD" />
      <rect x="197" y="6" width="137" height="186" rx="4" fill="#E2DACD" opacity=".6" />
      <g opacity="1">{cells}</g>
      <rect x="9" y="146" width="62" height="50" rx="6" fill="none" stroke="#B87A2B" strokeWidth="3" />
      <path d="M40 232V204" stroke="#B87A2B" strokeWidth="2.5" fill="none" />
      <path d="M33 211l7-10 7 10z" fill="#B87A2B" />
      <text x="54" y="232" fill="#1E3E8A" fontFamily="Allura,cursive" fontSize="26">Le Central</text>
      <text x="160" y="231" fill="#646A72" fontFamily="Montserrat,Arial,sans-serif" fontSize="11.5" fontWeight="600">en bas à gauche</text>
    </svg>
  );
}

const Steps = ({ items }) => <ol className="steps">{items.map((s) => <li key={s}>{s}</li>)}</ol>;

function fmtDate(iso) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' }).format(new Date(iso));
}

export function Photos() {
  return (
    <div className="photos">
      <img src="/logement/chambre.jpg" alt="La chambre" />
      <img src="/logement/cuisine.jpg" alt="La cuisine" />
    </div>
  );
}

export default function Logement({ info }) {
  const [open, setOpen] = useState(null); // 'route' | 'access'
  const toggle = (k) => setOpen(open === k ? null : k);
  const addr = info ? `${info.address.line1}, ${info.address.line2}` : '13 rue de la Sinne, 68100 Mulhouse';
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
  const recent = info?.keybox?.updated_at && Date.now() - new Date(info.keybox.updated_at).getTime() < 14 * 86400000;

  return (
    <section style={{ marginTop: 30 }}>
      <h2><span className="script">Le logement</span>Adresse et accès</h2>
      <div className="card">
        <div className="row between wrap-row">
          <div>
            <div style={{ fontWeight: 600 }}>{info?.address.line1 || '13 rue de la Sinne'}</div>
            <div className="muted">{info?.address.line2 || '68100 Mulhouse'} · 2e étage, porte 205</div>
          </div>
          <a className="btn small primary" href={maps} target="_blank" rel="noreferrer">Itinéraire</a>
        </div>
      </div>

      <div className="acc">
        <button className={`acc-head ${open === 'route' ? 'on' : ''}`} onClick={() => toggle('route')} aria-expanded={open === 'route'}>
          Comment s'y rendre <span aria-hidden="true">{open === 'route' ? '−' : '+'}</span>
        </button>
        {open === 'route' && (
          <div className="acc-body">
            <ul className="rows">
              <li><b>Tram</b><p>Arrêts Porte Haute et Tour Nessel : tram 2 et tram-train 3.</p></li>
              <li><b>Bus</b><p>Ligne 51, arrêt Porte du Miroir.</p></li>
              <li><b>Voiture</b><p>Parking des Trois-Rois à 300 m, ou stationnement payant dans la rue (du lundi au samedi, de 9 h à 12 h et de 14 h à 19 h).</p></li>
              <li><b>Vélo</b><p>Station de vélos en libre-service place de la Paix, en bas de l'immeuble.</p></li>
            </ul>
          </div>
        )}

        <button className={`acc-head ${open === 'access' ? 'on' : ''}`} onClick={() => toggle('access')} aria-expanded={open === 'access'}>
          Accès au logement <span aria-hidden="true">{open === 'access' ? '−' : '+'}</span>
        </button>
        {open === 'access' && (
          <div className="acc-body">
            <div className="code">
              <span>Code de la boîte à clés</span>
              <b>{info?.keybox?.code || '…'}</b>
              {recent && <em>Code changé le {fmtDate(info.keybox.updated_at)}</em>}
            </div>
            <h3 style={{ marginTop: 18 }}>Récupérer les clés</h3>
            <Steps items={[
              "Entrez dans le hall de l'immeuble.",
              'Allez aux boîtes aux lettres.',
              'Ouvrez la boîte aux lettres tout en bas à gauche, au nom « Le Central ».',
              'La boîte à clés est tout au fond de la boîte aux lettres.',
            ]} />
            <div className="plan"><Mailboxes /></div>
            <h3 style={{ marginTop: 18 }}>Rejoindre l'appartement</h3>
            <p className="muted" style={{ marginTop: 0 }}>2e étage, sonnette 205 « Le Central ».</p>
            <div className="duo">
              <div><b>Par l'escalier</b><Steps items={['Montez au 2e étage.', "Allez à gauche jusqu'au couloir.", 'Première porte à gauche.']} /></div>
              <div><b>Par l'ascenseur</b><Steps items={["Sortez de l'ascenseur.", 'Prenez le couloir à droite.', 'Première porte à gauche.']} /></div>
            </div>
            <div className="plan"><Plan /></div>
            <div className="callout"><b>En partant</b><span className="muted">Remettez les clés dans la boîte à clés, refermez-la et brouillez le code.</span></div>
          </div>
        )}
      </div>
    </section>
  );
}
