import { NextResponse } from 'next/server';

export function proxy(request) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  
  // Add security headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Security Headers for Vercel deployment
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CSP Header
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.hcaptcha.com https://hcaptcha.com https://va.vercel-scripts.com; " +
    "style-src 'self' 'unsafe-inline' https://hcaptcha.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://rdap.org https://rdap.db.ripe.net https://rdap.lacnic.net https://rdap.afrinic.net https://rdap.apnic.net https://rdap.arin.net https://api.github.com https://vitals.vercel-analytics.com https://vercel-insights.com; " +
    "frame-src https://hcaptcha.com https://newassets.hcaptcha.com; " +
    "worker-src 'self' blob:; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );

  // Cache control for static assets
  if (request.nextUrl.pathname.startsWith('/_next/static/') || 
      request.nextUrl.pathname.includes('.')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache control for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Don't cache lookup API responses
    if (request.nextUrl.pathname === '/api/lookup') {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      // Cache other API routes like OG images
      response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }
  }

  // Add HSTS header for HTTPS
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};