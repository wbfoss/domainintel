/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable experimental features available on Vercel
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
    optimizePackageImports: ['lucide-react'],
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },

  // Compress responses
  compress: true,

  // Headers for static assets
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|mp4|pdf)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          }
        ],
      },
      // Note: Next.js already serves /_next/static/* with immutable long-term
      // caching (content-hashed filenames), so we don't override it here — doing
      // so triggers a build warning and can interfere with dev behavior.
      {
        source: '/api/og/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },

  // Note: Next.js 16 uses Turbopack by default for `next dev` and `next build`.
  // The `@/*` path alias is resolved from jsconfig.json, so no bundler-specific
  // alias config is needed here.
  //
  // Do NOT set `output: 'standalone'` here — Vercel performs its own output
  // file tracing, and standalone mode breaks the Next 16 build on Vercel with
  // `ENOENT ... .next/next-server.js.nft.json`. Standalone is only for
  // self-hosting (e.g. Docker).

  // PoweredBy header removal for security
  poweredByHeader: false,
};

module.exports = nextConfig;