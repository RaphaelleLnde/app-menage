'use client';
import { useState } from 'react';

// Indicatifs : les plus fréquents d'abord, puis les autres par ordre alphabétique (code pays ISO)
const flag = (iso) => iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
const TOP = [['fr', '33'], ['de', '49'], ['ch', '41'], ['be', '32'], ['lu', '352'], ['gb', '44'], ['it', '39'], ['es', '34'], ['nl', '31'], ['pl', '48'], ['pt', '351'], ['ua', '380'], ['ge', '995'], ['at', '43'], ['us', '1']];
const OTHERS = [['ae', '971'], ['al', '355'], ['am', '374'], ['ar', '54'], ['au', '61'], ['az', '994'], ['ba', '387'], ['bg', '359'], ['br', '55'], ['by', '375'], ['ca', '1'], ['cl', '56'], ['cm', '237'], ['cn', '86'], ['co', '57'], ['ci', '225'], ['cy', '357'], ['cz', '420'], ['dk', '45'], ['dz', '213'], ['ee', '372'], ['eg', '20'], ['fi', '358'], ['gr', '30'], ['hk', '852'], ['hr', '385'], ['hu', '36'], ['id', '62'], ['ie', '353'], ['il', '972'], ['in', '91'], ['iq', '964'], ['ir', '98'], ['is', '354'], ['jo', '962'], ['jp', '81'], ['kr', '82'], ['kw', '965'], ['kz', '7'], ['lb', '961'], ['lt', '370'], ['lv', '371'], ['ma', '212'], ['md', '373'], ['me', '382'], ['mk', '389'], ['mt', '356'], ['mx', '52'], ['my', '60'], ['ng', '234'], ['no', '47'], ['nz', '64'], ['ph', '63'], ['pk', '92'], ['qa', '974'], ['ro', '40'], ['rs', '381'], ['ru', '7'], ['sa', '966'], ['se', '46'], ['sg', '65'], ['si', '386'], ['sk', '421'], ['sn', '221'], ['sy', '963'], ['th', '66'], ['tn', '216'], ['tr', '90'], ['tw', '886'], ['vn', '84'], ['za', '27']];
export const COUNTRIES = [...TOP, ...OTHERS];
// Indicatif proposé par défaut selon la langue choisie
export const DEFAULT_BY_LANG = { fr: 'fr', en: 'gb', de: 'de', es: 'es', it: 'it', nl: 'nl', pl: 'pl', pt: 'pt', uk: 'ua', ka: 'ge', ar: 'ma' };

export default function PhoneInput({ label, value, onChange, lang }) {
  const [iso, setIso] = useState(null); // choisi par la personne ; sinon selon la langue
  const [num, setNum] = useState(value ? value.replace(/^\+\d+\s*/, '') : '');
  const cur = iso || DEFAULT_BY_LANG[lang] || 'fr';
  const code = (COUNTRIES.find((c) => c[0] === cur) || COUNTRIES[0])[1];
  const emit = (c, n) => onChange(n.trim() ? `+${c} ${n.trim().replace(/^0+/, '')}` : '');
  return (
    <label className="field">
      <span>{label}</span>
      <div className="phone-row" dir="ltr">
        <select value={cur} onChange={(e) => { setIso(e.target.value); const c = COUNTRIES.find((x) => x[0] === e.target.value)[1]; emit(c, num); }} aria-label="Code">
          {COUNTRIES.map(([i, c], k) => <option key={i + k} value={i}>{flag(i)} +{c}</option>)}
        </select>
        <input type="tel" inputMode="tel" autoComplete="tel-national" value={num} placeholder="6 12 34 56 78"
          onChange={(e) => { setNum(e.target.value); emit(code, e.target.value); }} />
      </div>
    </label>
  );
}
