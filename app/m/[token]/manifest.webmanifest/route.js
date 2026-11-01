// Manifeste propre au lien du personnel, pour que l'icône sur l'écran d'accueil ouvre directement ce lien.
export function GET(req, { params }) {
  return Response.json({
    name: 'Ménage',
    short_name: 'Ménage',
    start_url: `/m/${params.token}`,
    scope: `/m/${params.token}`,
    display: 'standalone',
    background_color: '#f6f5f2',
    theme_color: '#2f6f5e',
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, { headers: { 'Content-Type': 'application/manifest+json' } });
}
