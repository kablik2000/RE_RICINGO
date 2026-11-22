import { z } from 'zod';

import { APP_ENVS, type AppEnv } from './app-env';

/** Runtime configuration the app relies on. Extend the schema when new values are added. */
export interface AppConfig {
  appEnv: AppEnv;
  appVersion: string;
}

const extraSchema = z.object({
  appEnv: z.enum(APP_ENVS),
});

const versionSchema = z.string().min(1);

/** Minimal shape of `Constants.expoConfig` used here (keeps this module free of expo imports). */
export interface ExpoConfigSource {
  version?: string;
  extra?: unknown;
}

/**
 * Validates the configuration embedded by `app.config.ts`. Fails fast: a misconfigured build must
 * not start with silently wrong settings.
 */
export function parseAppConfig(source: ExpoConfigSource | null | undefined): AppConfig {
  if (source === null || source === undefined) {
    throw new Error('App configuration is not available (Constants.expoConfig is empty).');
  }
  const extra = extraSchema.safeParse(source.extra);
  if (!extra.success) {
    throw new Error(`Invalid app configuration:\n${z.prettifyError(extra.error)}`);
  }
  const version = versionSchema.safeParse(source.version);
  if (!version.success) {
    throw new Error('Invalid app configuration: missing app version.');
  }
  return { appEnv: extra.data.appEnv, appVersion: version.data };
}
