'use client';
import { useEffect, useState, useCallback } from 'react';
import TopBar, { PROPERTY } from './TopBar';

// Prépare l'espace hôte : manifeste (ajout à l'écran d'accueil) et service worker (notifications).
function useHostShell() {
  useEffect(() => {
    if (!document.querySelector('link[rel=manifest]')) {
      const l = document.createElement('link');
      l.rel = 'manifest';
      l.href = '/manifest-admin.webmanifest';
      document.head.appendChild(l);
    }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
}

// Rôle de la session : 'host' ou 'concierge' (sert seulement à adapter l'affichage ;
// les droits sont vérifiés par le serveur).
export function useRole() {
  const [role, setRole] = useState(null);
  useEffect(() => {
    const m = /(?:^|; )menage_role=([^;]+)/.exec(document.cookie);
    setRole(m ? decodeURIComponent(m[1]) : 'host');
  }, []);
  return role;
}

// Charge une donnée de l'espace hôte et gère la connexion.
export function useHostData(url) {
  useHostShell();
  const [data, setData] = useState(null);
  const [authed, setAuthed] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!url) return;
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r.status === 401) { setAuthed(false); return; }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Chargement impossible.');
      setAuthed(true);
      setData(await r.json());
    } catch (e) {
      setError(e.message || 'Chargement impossible.');
    }
  }, [url]);
  useEffect(() => { reload(); }, [reload]);
  return { data, setData, authed, error, setError, reload };
}

// Cadre commun des pages hôte
export function HostPage({ host, children }) {
  const role = useRole();
  if (host.authed === false) return <LoginForm onDone={host.reload} />;
  return (
    <>
      <TopBar href="/admin" right={<span className="who">{role === 'concierge' ? 'Conciergerie' : 'Espace hôte'}</span>} />
      <main className="wrap">
        {!host.data && <p className="muted" style={{ marginTop: 24 }}>{host.error || 'Chargement…'}</p>}
        {host.data && children}
      </main>
    </>
  );
}

export function LoginForm({ onDone }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const r = await fetch('/api/host/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (!r.ok) { setError('Mot de passe incorrect.'); return; }
    onDone();
  };
  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 48 }}>
        <p className="le">Espace hôte</p>
        <h1>{PROPERTY}</h1>
      </div>
      <form onSubmit={submit} style={{ marginTop: 24 }}>
        <label className="field"><span>Mot de passe</span>
          <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary big" disabled={busy || !pw}>Se connecter</button>
      </form>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 18 }}>Conciergerie : ouvre le lien qui t'a été envoyé par l'hôte.</p>
    </main>
  );
}
