'use client';
import { useState } from 'react';
import { useHostData, HostPage } from '@/app/components/host';
import { Back } from '@/app/components/TopBar';
import { IconCamera, IconUp, IconDown, IconTrash } from '@/app/components/icons';

export default function ChecklistPage() {
  const host = useHostData('/api/host/checklist');
  const items = host.data;
  const [sheet, setSheet] = useState(null); // { index | null, room, label, photo }
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const rooms = items ? [...new Set(items.map((i) => i.room))] : [];

  const save = async (next, note) => {
    setSaving(true); setMsg('');
    const r = await fetch('/api/host/checklist', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: next }) });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg(d.error || 'Erreur'); return false; }
    host.setData(d);
    if (note) setMsg(note);
    return true;
  };

  const openNew = (room) => setSheet({ index: null, room: room ?? (rooms[0] || ''), newRoom: rooms.length === 0, label: '', photo: null });
  const openEdit = (index) => {
    const it = items[index];
    setSheet({ index, room: it.room, newRoom: false, label: it.label, photo: !!it.photo_required });
  };

  const submit = async () => {
    const room = sheet.room.trim();
    const label = sheet.label.trim();
    const entry = { room, label, photo_required: !!sheet.photo };
    let next;
    if (sheet.index === null) {
      // On range la nouvelle tâche à la fin de sa pièce
      let pos = -1;
      items.forEach((it, i) => { if (it.room === room) pos = i; });
      next = [...items];
      if (pos < 0) next.push(entry); else next.splice(pos + 1, 0, entry);
    } else {
      next = items.map((it, i) => (i === sheet.index ? { ...it, ...entry } : it));
    }
    if (await save(next, sheet.index === null ? 'Tâche ajoutée.' : 'Tâche modifiée.')) setSheet(null);
  };

  const remove = async (index) => {
    if (!confirm(`Supprimer « ${items[index].label} » ?`)) return;
    await save(items.filter((_, i) => i !== index), 'Tâche supprimée.');
    setSheet(null);
  };

  // Monte ou descend une tâche à l'intérieur de sa pièce
  const move = (index, dir) => {
    const room = items[index].room;
    let j = index + dir;
    while (j >= 0 && j < items.length && items[j].room !== room) j += dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    save(next);
  };

  const valid = sheet && sheet.room.trim() && sheet.label.trim() && sheet.photo !== null;

  return (
    <HostPage host={host}>
      {items && (
        <>
          <Back />
          <h1 className="title"><span className="script">À vérifier</span>Checklist</h1>
          <p className="lead">Touchez le bouton + pour ajouter une tâche, ou une tâche pour la modifier. Les ménages déjà commencés gardent leur liste.</p>
          {msg && <div className="ok">{msg}</div>}

          {rooms.map((room) => (
            <section key={room} className="card">
              <div className="room-head">
                <h3 style={{ margin: 0 }}>{room}</h3>
                <button className="small ghost" onClick={() => openNew(room)}>+ Ajouter ici</button>
              </div>
              {items.map((it, i) => it.room !== room ? null : (
                <div key={i} className="item">
                  <div className="lbl" onClick={() => openEdit(i)}>
                    <div>{it.label}</div>
                    {it.photo_required && <div className="tag"><IconCamera /> Photo obligatoire</div>}
                  </div>
                  <button className="iconbtn" onClick={() => move(i, -1)} aria-label="Monter" disabled={saving}><IconUp /></button>
                  <button className="iconbtn" onClick={() => move(i, 1)} aria-label="Descendre" disabled={saving}><IconDown /></button>
                </div>
              ))}
            </section>
          ))}
          {rooms.length === 0 && <p className="muted">La checklist est vide. Ajoutez une première tâche avec le bouton +.</p>}

          <button className="fab" onClick={() => openNew()} aria-label="Ajouter une tâche">+</button>

          {sheet && (
            <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
              <div className="sheet" role="dialog" aria-modal="true">
                <h2 style={{ marginTop: 0 }}>{sheet.index === null ? 'Nouvelle tâche' : 'Modifier la tâche'}</h2>

                <div className="field">
                  <span className="field-label">Quelle pièce ?</span>
                  <div className="chips">
                    {rooms.map((r) => (
                      <button key={r} className={`chip ${!sheet.newRoom && sheet.room === r ? 'on' : ''}`} onClick={() => setSheet({ ...sheet, room: r, newRoom: false })}>{r}</button>
                    ))}
                    <button className={`chip ${sheet.newRoom ? 'on' : ''}`} onClick={() => setSheet({ ...sheet, room: '', newRoom: true })}>+ Autre pièce</button>
                  </div>
                  {sheet.newRoom && (
                    <input type="text" style={{ marginTop: 10 }} placeholder="Nom de la pièce (ex. Balcon)" value={sheet.room} autoFocus onChange={(e) => setSheet({ ...sheet, room: e.target.value })} />
                  )}
                </div>

                <label className="field">
                  <span>Qu'est-ce qu'il faut faire ?</span>
                  <textarea style={{ minHeight: 70 }} placeholder="Ex. Nettoyer la table et les chaises du balcon" value={sheet.label} onChange={(e) => setSheet({ ...sheet, label: e.target.value })} />
                </label>

                <div className="field">
                  <span className="field-label">Faut-il une photo ?</span>
                  <div className="seg">
                    <button className={sheet.photo === true ? 'on' : ''} onClick={() => setSheet({ ...sheet, photo: true })}><IconCamera /> Oui, obligatoire</button>
                    <button className={sheet.photo === false ? 'on' : ''} onClick={() => setSheet({ ...sheet, photo: false })}>Non</button>
                  </div>
                </div>

                <button className="primary big" onClick={submit} disabled={!valid || saving} style={{ marginTop: 8 }}>
                  {sheet.index === null ? 'Ajouter la tâche' : 'Enregistrer'}
                </button>
                <div className="row between" style={{ marginTop: 10 }}>
                  <button className="ghost" onClick={() => setSheet(null)}>Annuler</button>
                  {sheet.index !== null && <button className="danger small" onClick={() => remove(sheet.index)}><IconTrash /> Supprimer</button>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </HostPage>
  );
}
