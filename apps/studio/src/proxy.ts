import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE } from '@/lib/session-cookie';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy with a per-request nonce: only scripts the Studio rendered can run, so
 * injected markup cannot execute code (XSS); `frame-ancestors 'none'` stops clickjacking.
 * Styles allow inline attributes (React `style={…}`); the risk there is limited to CSS.
 */
function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // React needs eval only in development (better error stacks), never in production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

/**
 * Runs before every page (ADR-0012):
 * 1. Without a session cookie, any page but /login redirects to /login. This is only the fast,
 *    optimistic path: every page and Server Action still verifies the session with the API
 *    (`requireTeacher`), and the API checks it on every request.
 * 2. Sets the Content Security Policy with a fresh nonce, which Next.js adds to its scripts.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname !== '/login' && !request.cookies.has(SESSION_COOKIE)) {
    const login = new URL('/login', request.url);
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Next.js internals (static files, dev reload) need neither a session nor a CSP.
      source: '/((?!_next/|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
