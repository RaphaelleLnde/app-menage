/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { serverActions: { bodySizeLimit: '8mb' } },
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
      { source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Referrer-Policy', value: 'no-referrer' }] },
    ];
  },
};
