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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Workspace packages ship TypeScript sources; Next compiles them like app code.
  transpilePackages: ['@ricingo/domain', '@ricingo/design-system'],
  allowedDevOrigins: localNetworkAddresses(),
};

export default nextConfig;
