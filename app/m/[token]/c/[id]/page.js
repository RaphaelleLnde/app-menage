'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { STATUS, fmtDay, fmtTime, turnoverLabel, compressImage, storage } from '@/app/components/client-utils';
import TopBar from '@/app/components/TopBar';
import { IconCamera, IconCheck } from '@/app/components/icons';
import NamePicker from '@/app/components/NamePicker';

export default function StaffCleaning({ params }) {
  const { token, id } = params;
  const [c, setC] = useState(null);
  const [name, setName] = useState(''); // prénom de la personne pour CE ménage
  const [names, setNames] = useState(null); // prénoms déjà enregistrés
  const [error, setError] = useState('');
  const [missing, setMissing] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState([]); // photos en cours d'envoi
  const [zoom, setZoom] = useState(null);
  const [noteSeen, setNoteSeen] = useState(true); // consigne de l'hôte déjà lue sur ce téléphone
  const fileInput = useRef(null);
  const target = useRef(null);
  const headers = { 'x-staff-token': token };

  const load = useCallback(async () => {
    const r = await fetch(`/api/staff/cleanings/${id}`, { headers: { 'x-staff-token': token }, cache: 'no-store' });
    if (!r.ok) { setError(r.status === 401 ? "Lien non valide." : 'Ménage introuvable.'); return; }
    setC(await r.json());
  }, [id, token]);

  useEffect(() => {
    setNoteSeen(!!storage()?.getItem(`menage_consigne_lue_${id}`));
    const saved = storage()?.getItem(`menage_prenom_${id}`) || '';
    setName(saved);
    if (!saved) {
      fetch('/api/staff/names', { headers: { 'x-staff-token': token }, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : [])).then(setNames).catch(() => setNames([]));
    }
    setNotes(storage()?.getItem(`menage_notes_${id}`) || '');
    load();
  }, [id, token, load]);

  const deleteName = async (n) => {
    const r = await fetch('/api/staff/names', { method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) });
    if (r.ok) setNames(await r.json());
  };

  const rememberName = (n) => { storage()?.setItem(`menage_prenom_${id}`, n); setName(n); };

  const start = async (n) => {
    setBusy(true); setError('');
    const r = await fetch(`/api/staff/cleanings/${id}/start`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) });
    setBusy(false);
    if (!r.ok) { setError((await r.json()).error || 'Erreur'); return; }
    rememberName(n);
    setC(await r.json()); // le serveur renvoie directement la checklist : pas de second chargement
  };

  const toggle = async (k) => {
    const checked = !k.checked;
    setC((cur) => ({ ...cur, checks: cur.checks.map((x) => (x.id === k.id ? { ...x, checked } : x)) }));
    setMissing([]); setError('');
    const r = await fetch(`/api/staff/cleanings/${id}/check`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ checkId: k.id, checked }) });
    if (!r.ok) { setError('La case n\'a pas été enregistrée, vérifie le réseau.'); load(); }
  };

  const pickPhoto = (checkId) => { target.current = checkId; fileInput.current.value = ''; fileInput.current.click(); };

  const upload = async (item) => {
    setPending((p) => p.map((x) => (x.key === item.key ? { ...x, status: 'uploading' } : x)));
    const fd = new FormData();
    fd.append('file', item.blob, 'photo.jpg');
    if (item.checkId) fd.append('checkId', String(item.checkId));
    fd.append('name', name);
    fd.append('clientTime', item.clientTime);
    try {
      const r = await fetch(`/api/staff/cleanings/${id}/photos`, { method: 'POST', headers, body: fd });
      if (!r.ok) throw new Error();
      const photo = await r.json();
      setC((cur) => ({ ...cur, photos: [...cur.photos, photo] }));
      setPending((p) => p.filter((x) => x.key !== item.key));
      URL.revokeObjectURL(item.preview);
      setMissing([]); setError('');
    } catch {
      setPending((p) => p.map((x) => (x.key === item.key ? { ...x, status: 'error' } : x)));
    }
  };

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const blob = await compressImage(f);
      const item = { key: Math.random().toString(36).slice(2), checkId: target.current, blob, preview: URL.createObjectURL(blob), status: 'uploading', clientTime: new Date().toISOString() };
      setPending((p) => [...p, item]);
      upload(item);
    }
  };

  const finish = async () => {
    setError(''); setMissing([]);
    if (pending.length) { setError('Attends que toutes les photos soient envoyées.'); return; }
    if (!confirm('Confirmer la fin du ménage ? L\'hôte sera prévenu.')) return;
    setBusy(true);
    const r = await fetch(`/api/staff/cleanings/${id}/complete`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, notes }) });
    setBusy(false);
    const d = await r.json();
    if (!r.ok) { setError(d.error || 'Erreur'); setMissing(d.missing || []); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    storage()?.removeItem(`menage_notes_${id}`);
    setC((cur) => ({ ...cur, status: 'done', completed_at: d.completed_at, completed_by: d.completed_by })); // pas de rechargement
  };

  const shell = (body) => (
    <>
      <TopBar href={`/m/${token}`} right={name ? <span className="who">{name}</span> : null} />
      <main className="wrap">{body}</main>
    </>
  );
  if (error && !c) return shell(<><div className="error">{error}</div><Link href={`/m/${token}`} className="btn small">Retour</Link></>);
  if (!c) return shell(<p className="muted" style={{ marginTop: 24 }}>Chargement…</p>);

  const header = (
    <>
      <Link href={`/m/${token}`} className="back" style={{ marginTop: 10 }}>‹ Tous les ménages</Link>
      <h1 className="title"><span className="script">Ménage</span>{fmtDay(c.date)}</h1>
      <div className="row wrap-row" style={{ gap: 8 }}>
        <span className={`badge ${c.status}`}>{STATUS[c.status]}</span>
        {c.next_checkin === c.date ? <b className="small" style={{ color: 'var(--gold)' }}>Nouveaux voyageurs le jour même</b> : turnoverLabel(c) && <span className="muted small">{turnoverLabel(c)}</span>}
      </div>
    </>
  );

  if (c.status === 'planned') {
    return shell(
      <>
        {header}
        {error && <div className="error">{error}</div>}
        <div style={{ marginTop: 22 }}>
          {names === null ? <p className="muted">Chargement…</p> : <NamePicker names={names} onSubmit={start} onDelete={deleteName} busy={busy} buttonLabel="Commencer le ménage" />}
        </div>
      </>
    );
  }

  if (c.status === 'done') {
    return shell(
      <>
        {header}
        <div className="band" style={{ marginTop: 22, textAlign: 'center' }}>
          <p className="script">Merci{c.completed_by ? ` ${c.completed_by}` : ''} !</p>
          <p>Ménage terminé à {fmtTime(c.completed_at)}, avec {c.photos.length} photo{c.photos.length > 1 ? 's' : ''}. L'hôte a été prévenue.</p>
        </div>
      </>
    );
  }

  if (c.status === 'cancelled') return shell(<>{header}<p>Ce ménage a été annulé.</p></>);

  // Ménage déjà commencé, ouvert sur un autre téléphone : on demande qui continue.
  if (!name) {
    return shell(
      <>
        {header}
        <p className="muted small" style={{ marginTop: 22 }}>Commencé par {c.cleaner_name}</p>
        {names === null ? <p className="muted">Chargement…</p> : (
          <NamePicker names={names} busy={busy} buttonLabel="Continuer" onDelete={deleteName} onSubmit={(n) => {
            rememberName(n);
            fetch('/api/staff/names', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) }).catch(() => {});
          }} />
        )}
      </>
    );
  }

  const done = c.checks.filter((k) => k.checked).length;
  const rooms = [...new Set(c.checks.map((k) => k.room))];
  const photosFor = (checkId) => c.photos.filter((p) => (p.check_id || null) === checkId);
  const pendingFor = (checkId) => pending.filter((p) => (p.checkId || null) === checkId);

  const Thumbs = ({ checkId }) => (
    (photosFor(checkId).length > 0 || pendingFor(checkId).length > 0) && (
      <div className="thumbs">
        {photosFor(checkId).map((p) => <img key={p.id} src={p.url} alt="" onClick={() => setZoom(p.url)} />)}
        {pendingFor(checkId).map((p) => (
          <div key={p.key} style={{ position: 'relative' }}>
            <img src={p.preview} alt="" style={{ opacity: 0.5 }} />
            {p.status === 'uploading' && <span className="small muted" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>envoi…</span>}
            {p.status === 'error' && <button className="small" style={{ position: 'absolute', inset: 0, minHeight: 0, padding: 2, fontSize: 11 }} onClick={() => upload(p)}>Échec, réessayer</button>}
          </div>
        ))}
      </div>
    )
  );

  const closeNote = () => { storage()?.setItem(`menage_consigne_lue_${id}`, '1'); setNoteSeen(true); };
  const extraCount = c.checks.filter((k) => k.room === "Consignes de l'hôte").length;

  return shell(
    <>
      {header}
      {c.host_note && (
        <div className="band" style={{ marginTop: 16 }}>
          <p className="script">Consigne de l'hôte</p>
          <p style={{ whiteSpace: 'pre-line' }}>{c.host_note}</p>
        </div>
      )}
      {(c.host_note || extraCount > 0) && !noteSeen && (
        <div className="sheet-bg">
          <div className="sheet" role="dialog" aria-modal="true">
            <p className="script" style={{ fontFamily: 'var(--script)', fontSize: 40, color: 'var(--blue)', margin: 0, lineHeight: 1 }}>Avant de commencer</p>
            <h2 style={{ marginTop: 6 }}>Consigne de l'hôte</h2>
            {c.host_note && <p style={{ whiteSpace: 'pre-line', fontSize: 16 }}>{c.host_note}</p>}
            {extraCount > 0 && <div className="callout"><b>{extraCount} point{extraCount > 1 ? 's' : ''} en plus dans la checklist</b><span className="muted">Ils sont en haut de la liste, dans « Consignes de l'hôte ».</span></div>}
            <button className="primary big" onClick={closeNote}>J'ai compris</button>
          </div>
        </div>
      )}
      <p className="muted small" style={{ margin: '10px 0 0' }}>Commencé par {c.cleaner_name} à {fmtTime(c.started_at)}</p>
      <div className="progress" aria-label="avancement"><div className="bar"><i style={{ width: `${(done / c.checks.length) * 100}%` }} /></div><span>{done} sur {c.checks.length}</span></div>

      {error && <div className="error">{error}{missing.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{missing.map((m) => <li key={m}>{m}</li>)}</ul>}</div>}

      <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />

      {rooms.map((room) => (
        <section key={room} className="card">
          <h3>{room}</h3>
          {c.checks.filter((k) => k.room === room).map((k) => (
            <div key={k.id} className="task">
              <button className={`tick ${k.checked ? 'on' : ''}`} onClick={() => toggle(k)} aria-label={k.checked ? 'Décocher' : 'Cocher'}>{k.checked && <IconCheck />}</button>
              <div className="task-label">
                <div className={k.checked ? 'done' : ''} onClick={() => toggle(k)}>{k.label}</div>
                {k.photo_required && photosFor(k.id).length === 0 && <div className="req">Photo obligatoire</div>}
                <Thumbs checkId={k.id} />
              </div>
              <button className="cam" onClick={() => pickPhoto(k.id)} aria-label="Prendre une photo"><IconCamera /></button>
            </div>
          ))}
        </section>
      ))}

      <section className="card">
        <h3>Autres photos</h3>
        <p className="muted small" style={{ marginTop: 0 }}>Casse, tache, objet oublié, produit manquant…</p>
        <Thumbs checkId={null} />
        <button className="small" style={{ marginTop: 8 }} onClick={() => pickPhoto(null)}><IconCamera /> Ajouter une photo</button>
      </section>

      <section className="card">
        <h3>Commentaire pour l'hôte</h3>
        <textarea value={notes} placeholder="Facultatif" onChange={(e) => { setNotes(e.target.value); storage()?.setItem(`menage_notes_${id}`, e.target.value); }} />
      </section>

      <div className="sticky-bottom"><div>
        <button className="primary big" onClick={finish} disabled={busy}>{busy ? 'Envoi…' : 'Terminer le ménage'}</button>
      </div></div>

      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
    </>
  );
}
