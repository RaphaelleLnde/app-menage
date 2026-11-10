'use client';
import { useState } from 'react';

// Date à taper au clavier : JJ/MM/AAAA, les « / » se placent tout seuls.
// Renvoie la date au format AAAA-MM-JJ, ou '' tant qu'elle n'est pas complète et valide.
const toIso = (txt) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt);
  if (!m) return '';
  const [, d, mo, y] = m;
  const dt = new Date(Date.UTC(+y, +mo - 1, +d));
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d || +y < 1900 || +y > 2100) return '';
  return `${y}-${mo}-${d}`;
};
const fromIso = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '');

export default function DateInput({ label, value, onChange, placeholder }) {
  const [txt, setTxt] = useState(fromIso(value));
  const iso = toIso(txt);
  const bad = txt.length === 10 && !iso;
  const change = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    const typing = e.target.value.length > txt.length; // on ajoute (et non on efface)
    let out = digits.slice(0, 2);
    if (digits.length > 2) out += '/' + digits.slice(2, 4);
    if (digits.length > 4) out += '/' + digits.slice(4);
    // Le « / » suivant apparaît dès que le jour ou le mois est complet
    if (typing && (digits.length === 2 || digits.length === 4)) out += '/';
    setTxt(out);
    onChange(toIso(out));
  };
  return (
    <label className="field">
      <span>{label}</span>
      <input type="text" inputMode="numeric" dir="ltr" autoComplete="off" placeholder={placeholder} maxLength={10}
        value={txt} onChange={change} style={bad ? { borderColor: 'var(--danger)' } : undefined} />
    </label>
  );
}
