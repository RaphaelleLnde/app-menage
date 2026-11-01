'use client';
import { useEffect, useState } from 'react';

function b64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
}

export default function Settings({ data, reload }) {
  const [origin, setOrigin] = useState('');
  const [msg, setMsg] = useState('');
  const [pushState, setPushState] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrigin(location.origin);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState(ios && !standalone ? 'ios-install' : 'unsupported');
    } else if (Notification.permission === 'granted') setPushState('granted');
    else if (Notification.permission === 'denied') setPushState('denied');
    else setPushState('default');
  }, []);

  const [names, setNames] = useState(data.staffNames || []);
  const [code, setCode] = useState(data.keybox?.code || '');
  const [savedCode, setSavedCode] = useState(data.keybox?.code || '');
  const saveCode = async () => {
    if (!confirm(`Nouveau code de la boîte à clés : ${code.trim()} ?`)) return;
    const r = await fetch('/api/host/keybox', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    if (r.ok) { const k = await r.json(); setSavedCode(k.code); setCode(k.code); setMsg('Code de la boîte à clés mis à jour.'); }
  };
  const removeName = async (n) => {
    if (!confirm(`Retirer « ${n} » de la liste ? Les ménages déjà faits gardent son nom.`)) return;
    const r = await fetch('/api/host/staff-names', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) });
    if (r.ok) setNames(await r.json());
  };

  const concierge = data.role === 'concierge';
  const conciergeUrl = data.conciergePath ? origin + data.conciergePath : null;
  const copyText = async (t) => { try { await navigator.clipboard.writeText(t); setMsg('Lien copié.'); } catch { setMsg('Copie impossible, sélectionne le lien à la main.'); } };

  const staffUrl = data.staffPath ? origin + data.staffPath : null;

  const copy = async () => {
    try { await navigator.clipboard.writeText(staffUrl); setMsg('Lien copié.'); } catch { setMsg('Copie impossible, sélectionne le lien à la main.'); }
  };

  const enablePush = async () => {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushState(perm); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) });
      const r = await fetch('/api/host/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
      if (!r.ok) throw new Error();
      setPushState('granted');
      setMsg('Notifications activées sur cet appareil.');
    } catch {
      setMsg('Activation impossible sur cet appareil.');
    } finally { setBusy(false); }
  };

  const testPush = async () => {
    const r = await fetch('/api/host/push/test', { method: 'POST' });
    const d = await r.json();
    setMsg(d.sent ? 'Notification de test envoyée.' : `Aucune notification envoyée${d.reason ? ' (' + d.reason + ')' : ''}.`);
  };

  const sync = async () => {
    setBusy(true); setMsg('');
    const r = await fetch('/api/host/sync', { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    setMsg(r.ok ? (d.skipped ? d.skipped : `Calendriers lus (${d.sources.map((x) => (x === 'booking' ? 'Booking' : 'Airbnb')).join(' et ')}) : ${d.added} ajouté(s), ${d.moved} déplacé(s), ${d.cancelled} annulé(s).${d.errors.length ? ' Problème : ' + d.errors.join(', ') : ''}`) : d.error);
    reload();
  };

  const logout = async () => { await fetch('/api/host/logout', { method: 'POST' }); location.reload(); };

  return (
    <>
      {msg && <div className="ok">{msg}</div>}
      {!concierge && <>
      <div className="card">
        <h3>Lien de la conciergerie</h3>
        {conciergeUrl ? (
          <>
            <p className="muted small" style={{ marginTop: 0 }}>Pour la responsable de l'entreprise de ménage : elle voit les réservations, les ménages et l'historique, et peut faire les ménages elle-même. Elle ne peut rien annuler ni modifier.</p>
            <input type="text" readOnly value={conciergeUrl} onFocus={(e) => e.target.select()} />
            <div className="row" style={{ marginTop: 8 }}><button className="small primary" onClick={() => copyText(conciergeUrl)}>Copier le lien</button></div>
          </>
        ) : <p className="error">CONCIERGE_TOKEN n'est pas configuré.</p>}
      </div>

      <div className="card">
        <h3>Lien du personnel de ménage</h3>
        {staffUrl ? (
          <>
            <p className="muted small" style={{ marginTop: 0 }}>Envoie ce lien aux personnes qui font le ménage. Elles indiqueront leur prénom au début de chaque ménage. Garde-le privé : toute personne qui l'a peut accéder aux ménages.</p>
            <input type="text" readOnly value={staffUrl} onFocus={(e) => e.target.select()} />
            <div className="row" style={{ marginTop: 8 }}><button className="small primary" onClick={copy}>Copier le lien</button></div>
          </>
        ) : <p className="error">STAFF_TOKEN n'est pas configuré.</p>}
      </div>

      <div className="card">
        <h3>Boîte à clés</h3>
        <p className="muted small" style={{ marginTop: 0 }}>Code affiché au personnel dans « Accès au logement ». Si tu changes le code, mets-le à jour ici : la personne verra « Code changé le … » pendant deux semaines.</p>
        <div className="row">
          <input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} style={{ maxWidth: 160, fontSize: 20, letterSpacing: '.2em', fontWeight: 600 }} />
          <button className="small primary" onClick={saveCode} disabled={!code.trim() || code.trim() === savedCode}>Enregistrer</button>
        </div>
      </div>

      <div className="card">
        <h3>Personnel enregistré</h3>
        <p className="muted small" style={{ marginTop: 0 }}>Les prénoms proposés au début de chaque ménage. Un prénom s'ajoute tout seul la première fois qu'il est saisi.</p>
        {names.length === 0 && <p className="muted small">Aucun prénom pour l'instant.</p>}
        <ul className="rows">
          {names.map((n) => (
            <li key={n} className="row between">
              <span>{n}</span>
              <button className="small danger" onClick={() => removeName(n)}>Retirer</button>
            </li>
          ))}
        </ul>
      </div>

      </>}

      <div className="card">
        <h3>Notifications sur ce téléphone</h3>
        <p className="muted small" style={{ marginTop: 0 }}>Une notification à la fin de chaque ménage, avec une alerte « Remarques à vérifier » quand la personne a laissé un commentaire ou une photo de problème.</p>
        {!data.pushConfigured && <p className="error">Les clés de notification (VAPID) ne sont pas configurées.</p>}
        {pushState === 'ios-install' && <p className="muted">Sur iPhone : ouvre cette page dans Safari, touche Partager puis « Sur l'écran d'accueil », puis ouvre l'application depuis la nouvelle icône pour activer les notifications.</p>}
        {pushState === 'unsupported' && <p className="muted">Ce navigateur ne gère pas les notifications.</p>}
        {pushState === 'denied' && <p className="muted">Les notifications ont été refusées. Autorise-les dans les réglages du téléphone pour cette application.</p>}
        {pushState === 'default' && <button className="primary" onClick={enablePush} disabled={busy || !data.pushConfigured}>Activer les notifications</button>}
        {pushState === 'granted' && (
          <>
            <p style={{ marginTop: 0 }}><span className="badge done">Activées</span></p>
            <div className="row wrap-row">
              <button className="small primary" onClick={testPush}>Envoyer un test</button>
              <button className="small" onClick={enablePush} disabled={busy}>Réenregistrer</button>
            </div>
          </>
        )}
      </div>

      {!concierge && <div className="card">
        <h3>Calendriers Airbnb et Booking</h3>
        <p className="muted small" style={{ marginTop: 0 }}>Un ménage est créé automatiquement le jour de chaque départ.</p>
        <ul className="rows" style={{ marginBottom: 10 }}>
          <li className="row between"><span>Airbnb</span>{data.icalSources?.airbnb ? <span className="badge done">Relié</span> : <span className="badge">Pas relié (ICAL_URL)</span>}</li>
          <li className="row between"><span>Booking.com</span>{data.icalSources?.booking ? <span className="badge done">Relié</span> : <span className="badge">Pas relié (ICAL_URL_BOOKING)</span>}</li>
        </ul>
        {data.lastSync?.errors?.length > 0 && <div className="error small">Dernière lecture : {data.lastSync.errors.join(', ')}</div>}
        <button className="small" onClick={sync} disabled={busy || !data.icalConfigured}>Relire les calendriers maintenant</button>
      </div>}

      <button className="small ghost" onClick={logout} style={{ marginTop: 8 }}>Se déconnecter</button>
    </>
  );
}
