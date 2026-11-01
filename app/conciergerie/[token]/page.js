'use client';
import { useEffect, useState } from 'react';
import { PROPERTY } from '@/app/components/TopBar';

// Lien de la conciergerie : ouvre la session puis renvoie vers l'espace de suivi.
export default function ConciergeEntry({ params }) {
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/concierge/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.token }) })
      .then((r) => (r.ok ? location.replace('/admin') : setError("Ce lien n'est pas valide. Demande le bon lien à l'hôte.")))
      .catch(() => setError('Connexion impossible. Vérifie le réseau puis réessaie.'));
  }, [params.token]);
  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 48 }}>
        <p className="le">Conciergerie</p>
        <h1>{PROPERTY}</h1>
      </div>
      {error ? <div className="error">{error}</div> : <p className="muted" style={{ textAlign: 'center' }}>Ouverture…</p>}
    </main>
  );
}
