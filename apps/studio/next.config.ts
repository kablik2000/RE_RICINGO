import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Workspace packages ship TypeScript sources; Next compiles them like app code.
  transpilePackages: ['@ricingo/domain', '@ricingo/design-system'],
};

export default nextConfig;
