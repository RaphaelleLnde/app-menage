'use client';
import { useEffect, useRef, useState } from 'react';
import { T, LANGS } from './i18n';
import PhoneInput from './PhoneInput';
import DateInput from './DateInput';

const emptyTraveller = () => ({ _k: Math.random(), last_name: '', first_names: '', birth_date: '', birth_city: '', birth_country: '', nationality: '', address: '', phone: '', email: '', signature: '' });

// Zone de signature au doigt
function SignaturePad({ value, onChange, t }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1E3E8A';
  }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); drawing.current = true; const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  const move = (e) => { if (!drawing.current) return; const ctx = ref.current.getContext('2d'); ctx.lineTo(...pos(e)); ctx.stroke(); };
  const up = () => { if (!drawing.current) return; drawing.current = false; onChange(ref.current.toDataURL('image/png')); };
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onChange(''); };
  return (
    <div>
      <canvas ref={ref} className="sigpad" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <div className="row between" style={{ marginTop: 4 }}>
        <span className="muted small">{value ? t.signed : t.signHere}</span>
        {value && <button type="button" className="small ghost" onClick={clear}>{t.clear}</button>}
      </div>
    </div>
  );
}

export default function GuestForm({ code }) {
  const [lang, setLang] = useState('fr');
  const [step, setStep] = useState(1); // 1 séjour, 2 nationalité, 3 fiches, 4 merci
  const [stay, setStay] = useState({ lead_name: '', lead_phone: '', arrival: '', departure: '' });
  const [french, setFrench] = useState(null);
  const [travellers, setTravellers] = useState([emptyTraveller()]);
  const [children, setChildren] = useState([]);
  const [certify, setCertify] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const t = T[lang];

  useEffect(() => {
    const l = (navigator.language || 'fr').slice(0, 2);
    if (LANGS.some((x) => x.key === l)) setLang(l);
    // Formulaire déjà envoyé depuis ce téléphone : on montre directement la page de bienvenue
    try { const d = JSON.parse(localStorage.getItem('lecentral_checkin') || 'null'); if (d) { setFrench(d.french); setStep(4); } } catch {}
  }, []);
  // Arabe : lecture de droite à gauche
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; }, [lang]);

  const setTr = (i, k, v) => setTravellers((cur) => cur.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setCh = (i, k, v) => setChildren((cur) => cur.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const send = async (allFrench) => {
    setErr(''); setBusy(true);
    const r = await fetch(`/api/guest/${code}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...stay, lang, all_french: allFrench, travellers: allFrench ? [] : travellers.map(({ birth_city, birth_country, ...x }) => ({ ...x, birth_place: `${birth_city.trim()}, ${birth_country.trim()}` })), children: allFrench ? [] : children }),
    }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) { const d = r ? await r.json().catch(() => ({})) : {}; setErr(t.errors[d.error] || t.errors.network); return; }
    try { localStorage.setItem('lecentral_checkin', JSON.stringify({ french: allFrench, at: Date.now() })); } catch {}
    setFrench(allFrench); setStep(4); top();
  };
  const restart = () => {
    try { localStorage.removeItem('lecentral_checkin'); } catch {}
    setStay({ lead_name: '', lead_phone: '', arrival: '', departure: '' }); setFrench(null); setTravellers([emptyTraveller()]); setChildren([]); setCertify(false); setStep(1); top();
  };

  const next1 = () => {
    setErr('');
    if (!stay.lead_name.trim()) return setErr(t.errors.name);
    if (stay.lead_phone.replace(/\D/g, '').length < 7) return setErr(t.errors.phone);
    if (!stay.arrival || !stay.departure || stay.departure <= stay.arrival) return setErr(t.errors.dates);
    setStep(2); top();
  };
  const next3 = () => {
    setErr('');
    for (const x of travellers) {
      if (!x.last_name.trim() || !x.first_names.trim() || !x.birth_date || !x.birth_city.trim() || !x.birth_country.trim() || !x.nationality.trim() || !x.address.trim() || !x.phone.trim() || !x.email.trim()) return setErr(t.errors.fields);
      if (!x.signature) return setErr(t.errors.signature);
    }
    if (!certify) return setErr(t.errors.certify);
    send(false);
  };

  const field = (label, value, onChange, props = {}) => (
    <label className="field"><span>{label}</span><input type="text" value={value} onChange={(e) => onChange(e.target.value)} {...props} /></label>
  );

  return (
    <>
      <header className="top"><span className="brand">Le Central</span>
        <select className="langsel" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
      </header>
      <main className="wrap">
        <h1 className="title"><span className="script">{t.welcome}</span>{t.title}</h1>

        {step === 1 && (
          <>
            <p className="lead">{t.intro}</p>
            <p className="privacy">{t.privacy}</p>
            <section className="card">
              {field(t.leadName, stay.lead_name, (v) => setStay({ ...stay, lead_name: v }), { autoComplete: 'name' })}
              <PhoneInput label={t.leadPhone} value={stay.lead_phone} lang={lang} onChange={(v) => setStay((cur) => ({ ...cur, lead_phone: v }))} />
              <div>
                <DateInput label={t.arrival} value={stay.arrival} placeholder={t.datePh} onChange={(v) => setStay((cur) => ({ ...cur, arrival: v }))} />
                <DateInput label={t.departure} value={stay.departure} placeholder={t.datePh} onChange={(v) => setStay((cur) => ({ ...cur, departure: v }))} />
              </div>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} />
            </section>
            {err && <div className="error">{err}</div>}
            <button className="primary big" onClick={next1}>{t.next}</button>
          </>
        )}

        {step === 2 && (
          <>
            <section className="card">
              <h3 style={{ marginTop: 0 }}>{t.frenchQ}</h3>
              <p className="muted small" style={{ marginTop: 0 }}>{t.frenchHelp} {t.privacy}</p>
              <div className="seg">
                <button className={french === true ? 'on' : ''} onClick={() => setFrench(true)}>{t.yesAll}</button>
                <button className={french === false ? 'on' : ''} onClick={() => setFrench(false)}>{t.no}</button>
              </div>
            </section>
            {err && <div className="error">{err}</div>}
            {french === true && <button className="primary big" disabled={busy} onClick={() => send(true)}>{busy ? '…' : t.confirm}</button>}
            {french === false && <button className="primary big" onClick={() => { setStep(3); top(); }}>{t.next}</button>}
            <button className="ghost" style={{ marginTop: 10 }} onClick={() => setStep(1)}>‹ {t.back}</button>
          </>
        )}

        {step === 3 && (
          <>
            <p className="lead" style={{ whiteSpace: 'pre-line' }}>{t.formIntro}</p>
            <p className="privacy">{t.privacy}</p>
            {travellers.map((x, i) => (
              <section key={x._k} className="card">
                <div className="row between">
                  <h3 style={{ margin: 0 }}>{t.traveller} {i + 1}</h3>
                  {travellers.length > 1 && <button className="small ghost" onClick={() => setTravellers(travellers.filter((_, j) => j !== i))}>{t.remove}</button>}
                </div>
                {field(t.lastName, x.last_name, (v) => setTr(i, 'last_name', v), { autoComplete: 'family-name' })}
                {field(t.firstNames, x.first_names, (v) => setTr(i, 'first_names', v), { autoComplete: 'given-name' })}
                <div>
                  <DateInput label={t.birthDate} value={x.birth_date} placeholder={t.datePh} onChange={(v) => setTr(i, 'birth_date', v)} />
                  {field(t.birthCity, x.birth_city, (v) => setTr(i, 'birth_city', v))}
                  {field(t.birthCountry, x.birth_country, (v) => setTr(i, 'birth_country', v))}
                </div>
                {field(t.nationality, x.nationality, (v) => setTr(i, 'nationality', v))}
                <label className="field"><span>{t.address}</span><textarea value={x.address} placeholder={t.addressHint} style={{ minHeight: 70 }} onChange={(e) => setTr(i, 'address', e.target.value)} /></label>
                <PhoneInput label={t.phone} value={x.phone} lang={lang} onChange={(v) => setTr(i, 'phone', v)} />
                {field(t.email, x.email, (v) => setTr(i, 'email', v), { type: 'email', autoComplete: 'email' })}
                <span className="field-label">{t.signature}</span>
                <SignaturePad value={x.signature} onChange={(v) => setTr(i, 'signature', v)} t={t} />
              </section>
            ))}
            <button className="small" onClick={() => setTravellers([...travellers, emptyTraveller()])}>+ {t.addTraveller}</button>

            <section className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>{t.children}</h3>
              <p className="muted small" style={{ marginTop: 0 }}>{t.childrenHelp}</p>
              {children.map((c, i) => (
                <div key={c._k} style={{ borderTop: i ? '1px solid var(--line)' : 0, paddingTop: i ? 10 : 0 }}>
                  <div>
                    {field(t.lastName, c.last_name, (v) => setCh(i, 'last_name', v))}
                    {field(t.firstNames, c.first_names, (v) => setCh(i, 'first_names', v))}
                  </div>
                  <div>
                    <DateInput label={t.birthDate} value={c.birth_date} placeholder={t.datePh} onChange={(v) => setCh(i, 'birth_date', v)} />
                    <label className="field"><span>{t.parent}</span>
                      <select value={c.parent} onChange={(e) => setCh(i, 'parent', e.target.value)}>
                        <option value="">-</option>
                        {travellers.map((x, j) => <option key={j} value={`${x.first_names} ${x.last_name}`.trim()}>{`${x.first_names} ${x.last_name}`.trim() || `${t.traveller} ${j + 1}`}</option>)}
                      </select>
                    </label>
                  </div>
                  <button className="small ghost" onClick={() => setChildren(children.filter((_, j) => j !== i))}>{t.remove}</button>
                </div>
              ))}
              <button className="small" onClick={() => setChildren([...children, { _k: Math.random(), last_name: '', first_names: '', birth_date: '', parent: '' }])}>+ {t.addChild}</button>
            </section>

            <label className="row" style={{ alignItems: 'flex-start', gap: 10, margin: '16px 0' }}>
              <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} style={{ width: 22, height: 22, flex: 'none', marginTop: 2 }} />
              <span className="small">{t.certify}</span>
            </label>
            {err && <div className="error">{err}</div>}
            <button className="primary big" disabled={busy} onClick={next3}>{busy ? '…' : t.send}</button>
            <button className="ghost" style={{ marginTop: 10 }} onClick={() => setStep(2)}>‹ {t.back}</button>
            <p className="muted small" style={{ marginTop: 18 }}>{t.legal}</p>
          </>
        )}

        {step === 4 && (
          <>
            <div className="band" style={{ textAlign: 'center' }}>
              <p className="script" style={{ fontSize: 34 }}>{t.thanks}</p>
              <p>{french ? t.doneFrench : t.doneForm}</p>
            </div>
            <section className="card">
              <p style={{ margin: 0, fontWeight: 600 }}>Le Central</p>
              <p className="muted" style={{ margin: '2px 0 10px' }}>13 rue de la Sinne, 68100 Mulhouse</p>
              <p style={{ margin: 0 }}>{t.arrivalInfo}<br />{t.departureInfo}</p>
              <a className="btn primary big" style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }} href="/livret-le-central.pdf" target="_blank" rel="noopener">{t.livretBtn}</a>
              <p className="muted small" style={{ margin: '8px 0 0' }}>{t.livretNote}</p>
              <a className="btn small" style={{ marginTop: 12 }} href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('13 rue de la Sinne, 68100 Mulhouse')}`} target="_blank" rel="noreferrer">Google Maps</a>
            </section>
            <button className="ghost small" style={{ marginTop: 8 }} onClick={restart}>{t.anotherForm}</button>
          </>
        )}
      </main>
    </>
  );
}
