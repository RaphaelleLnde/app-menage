'use client';
import { useState } from 'react';
import { IconCamera } from './icons';

// Découpe le message en phrases pour les proposer comme points de checklist
function suggestions(text) {
  return String(text || '')
    .split(/\n+|[.!?]\s+/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, '').replace(/[.!]+$/, ''))
    .filter((s) => s.length >= 4);
}

export default function ConsignesSheet({ cleaning, title, onClose, onSaved }) {
  const canExtra = cleaning.status === 'planned';
  const [note, setNote] = useState(cleaning.host_note || '');
  const [extras, setExtras] = useState(cleaning.extra_tasks || []);
  const [wantExtras, setWantExtras] = useState((cleaning.extra_tasks || []).length ? true : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sugg = suggestions(note).filter((s) => !extras.some((e) => e.label === s));
  const setExtra = (i, patch) => setExtras(extras.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const save = async () => {
    setBusy(true); setError('');
    const body = { host_note: note };
    if (canExtra) body.extra_tasks = wantExtras ? extras.filter((e) => e.label.trim()) : [];
    const r = await fetch(`/api/host/cleanings/${cleaning.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) { setError((await r.json()).error || 'Erreur'); return; }
    onSaved();
  };

  const needChoice = canExtra && note.trim() && wantExtras === null;

  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <h2 style={{ marginTop: 0 }}>Consignes{title ? ` · ${title}` : ''}</h2>
        <p className="muted small" style={{ marginTop: -4 }}>Ce message s'affichera quand la personne commencera le ménage.</p>

        <label className="field">
          <span>Message</span>
          <textarea placeholder="Ex. Les voyageurs ont signalé une tache sur le canapé. Vérifier aussi que la télécommande est bien là." value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        {canExtra ? (
          <div className="field">
            <span className="field-label">Ajouter des points à la checklist ?</span>
            <div className="seg">
              <button type="button" className={wantExtras === false ? 'on' : ''} onClick={() => setWantExtras(false)}>Non, juste le message</button>
              <button type="button" className={wantExtras === true ? 'on' : ''} onClick={() => setWantExtras(true)}>Oui</button>
            </div>

            {wantExtras && (
              <>
                {sugg.length > 0 && (
                  <>
                    <p className="small muted" style={{ margin: '14px 0 6px' }}>Proposés d'après ton message, touche pour ajouter :</p>
                    <div className="chips">
                      {sugg.map((s) => <button type="button" key={s} className="chip" onClick={() => setExtras([...extras, { label: s, photo_required: false }])}>+ {s}</button>)}
                    </div>
                  </>
                )}
                {extras.map((e, i) => (
                  <div key={i} className="card" style={{ margin: '10px 0 0', padding: 12 }}>
                    <textarea style={{ minHeight: 56 }} value={e.label} placeholder="Ce qu'il faut faire" onChange={(ev) => setExtra(i, { label: ev.target.value })} />
                    <div className="row between" style={{ marginTop: 8 }}>
                      <button type="button" className={`chip ${e.photo_required ? 'on' : ''}`} onClick={() => setExtra(i, { photo_required: !e.photo_required })}>
                        <IconCamera /> {e.photo_required ? 'Photo obligatoire' : 'Sans photo'}
                      </button>
                      <button type="button" className="small danger" onClick={() => setExtras(extras.filter((_, j) => j !== i))}>Retirer</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="small" style={{ marginTop: 10 }} onClick={() => setExtras([...extras, { label: '', photo_required: false }])}>+ Ajouter un point</button>
              </>
            )}
          </div>
        ) : (
          <p className="muted small">Le ménage a commencé : le message peut encore être modifié, mais plus la checklist.</p>
        )}

        {error && <div className="error">{error}</div>}
        <button className="primary big" onClick={save} disabled={busy || needChoice}>Enregistrer</button>
        {needChoice && <p className="small muted" style={{ textAlign: 'center' }}>Indique si tu veux ajouter des points à la checklist.</p>}
        <div className="row between" style={{ marginTop: 8 }}>
          <button className="ghost" onClick={onClose}>Annuler</button>
          {(cleaning.host_note || (cleaning.extra_tasks || []).length > 0) && (
            <button className="small danger" onClick={async () => {
              if (!confirm('Supprimer le message et les points ajoutés ?')) return;
              await fetch(`/api/host/cleanings/${cleaning.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(canExtra ? { host_note: '', extra_tasks: [] } : { host_note: '' }) });
              onSaved();
            }}>Tout effacer</button>
          )}
        </div>
      </div>
    </div>
  );
}
