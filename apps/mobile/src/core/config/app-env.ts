/**
 * Deployment environments. Each maps to its own backend project and EAS Update channel
 * (see docs/DECISIONS/0005-update-and-release-strategy.md).
 *
 * Kept dependency-free: it is imported both by `app.config.ts` (Node, at build time) and by the app.
 */
export const APP_ENVS = ['development', 'preview', 'production'] as const;

export type AppEnv = (typeof APP_ENVS)[number];

export function isAppEnv(value: unknown): value is AppEnv {
  return APP_ENVS.some((env) => env === value);
}
