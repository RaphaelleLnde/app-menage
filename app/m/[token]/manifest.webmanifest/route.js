// Manifeste propre au lien du personnel, pour que l'icône sur l'écran d'accueil ouvre directement ce lien.
export function GET(req, { params }) {
  return Response.json({
    name: 'Ménage Le Central',
    short_name: 'Ménage Le Central',
    start_url: `/m/${params.token}`,
    scope: `/m/${params.token}`,
    display: 'standalone',
    background_color: '#F3EEE6',
    theme_color: '#1E3E8A',
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, { headers: { 'Content-Type': 'application/manifest+json' } });
}
