'use client';
import { useEffect, useState } from 'react';

// Liste des prénoms enregistrés, « Nouveau prénom », puis le bouton d'action.
export default function NamePicker({ names, onSubmit, onDelete, busy, buttonLabel }) {
  const [sel, setSel] = useState(null);
  const [isNew, setIsNew] = useState(names.length === 0);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const value = isNew ? draft.trim() : sel;

  // Plus aucun prénom : on repasse directement à la saisie
  useEffect(() => { if (names.length === 0) { setEditing(false); setIsNew(true); } }, [names.length]);

  const submit = (e) => { e.preventDefault(); if (value) onSubmit(value); };
  const del = async (n) => {
    if (!confirm(`Supprimer « ${n} » de la liste ?`)) return;
    await onDelete(n);
    if (sel === n) setSel(null);
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <div className="chips">
          {names.map((n) => (
            editing
              ? <button type="button" key={n} className="chip del" onClick={() => del(n)} aria-label={`Supprimer ${n}`}>{n} <span aria-hidden="true">✕</span></button>
              : <button type="button" key={n} className={`chip ${!isNew && sel === n ? 'on' : ''}`} onClick={() => { setSel(n); setIsNew(false); }}>{n}</button>
          ))}
          {!editing && <button type="button" className={`chip ${isNew ? 'on' : ''}`} onClick={() => { setIsNew(true); setSel(null); }}>+ Nouveau prénom</button>}
        </div>
        {isNew && !editing && (
          <input type="text" style={{ marginTop: 12 }} placeholder="Prénom" autoComplete="given-name"
            autoFocus={names.length > 0} value={draft} onChange={(e) => setDraft(e.target.value)} />
        )}
        {names.length > 0 && onDelete && (
          <button type="button" className="small ghost" style={{ marginTop: 8, paddingLeft: 0 }} onClick={() => setEditing(!editing)}>
            {editing ? 'Terminé' : 'Supprimer un prénom'}
          </button>
        )}
      </div>
      {!editing && <button className="primary big" type="submit" disabled={busy || !value}>{buttonLabel}</button>}
    </form>
  );
}
