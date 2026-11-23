import { networkInterfaces } from 'node:os';

import type { NextConfig } from 'next';

/**
 * This PC's IPv4 addresses on the local network. The dev server blocks its scripts for other
 * hosts than localhost, so without these the Studio opened at http://<PC IP>:3000 renders but
 * nothing on it reacts to clicks.
 */
function localNetworkAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === 'IPv4' && !address.internal)
    .map((address) => address.address);
}

/** Sent with every response; the Content Security Policy is set per request in `src/proxy.ts`. */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // HTTPS only from production on (development runs over plain HTTP on the local network).
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: () => Promise.resolve([{ source: '/:path*', headers: SECURITY_HEADERS }]),
  typedRoutes: true,
  // Workspace packages ship TypeScript sources; Next compiles them like app code.
  transpilePackages: ['@ricingo/domain', '@ricingo/design-system'],
  allowedDevOrigins: localNetworkAddresses(),
};

export default nextConfig;
