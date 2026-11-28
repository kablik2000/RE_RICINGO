import { z } from 'zod';

import { APP_ENVS, type AppEnv } from './app-env';

/** Runtime configuration the app relies on. Extend the schema when new values are added. */
export interface AppConfig {
  appEnv: AppEnv;
  appVersion: string;
  /**
   * Base URL of the RICI API that serves published lessons, or `null` when this build does not
   * download content (it then uses the lessons bundled with the app).
   */
  contentApiUrl: string | null;
}

const extraSchema = z.object({
  appEnv: z.enum(APP_ENVS),
  apiUrl: z.url().optional(),
});

/** Port of the local API in the Docker stack (`compose.yaml`). */
const DEV_API_PORT = 8000;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);
/** How the Android emulator reaches the computer it runs on. */
const ANDROID_EMULATOR_HOST = '10.0.2.2';

const versionSchema = z.string().min(1);

/** Minimal shape of `Constants.expoConfig` used here (keeps this module free of expo imports). */
export interface ExpoConfigSource {
  version?: string;
  extra?: unknown;
  /** Development server address (`192.168.1.20:8081`), present in development builds. */
  hostUri?: string;
}

/** Platform facts needed to find the API. */
export interface RuntimePlatform {
  os: string;
  /** Web only: the origin the app was loaded from (`https://app.rici.esprog.eu`). */
  origin?: string;
}

/**
 * The API URL: `extra.apiUrl` when the build sets one (`RICI_API_URL`); in development the local
 * Docker API on the computer that runs the dev server. A built web app (ADR-0019) calls the API
 * on its own origin, where the web server forwards `/api/*` (the API allows no cross-origin
 * requests); the web development preview downloads nothing.
 */
export function resolveContentApiUrl(
  appEnv: AppEnv,
  configured: string | undefined,
  hostUri: string | undefined,
  platform: RuntimePlatform,
): string | null {
  if (configured !== undefined) {
    return configured.replace(/\/+$/, '');
  }
  if (platform.os === 'web') {
    return appEnv === 'development' || platform.origin === undefined ? null : platform.origin;
  }
  if (appEnv !== 'development') {
    return null;
  }
  const devHost = hostUri?.split(':')[0] ?? 'localhost';
  const host =
    platform.os === 'android' && LOOPBACK_HOSTS.has(devHost) ? ANDROID_EMULATOR_HOST : devHost;
  return `http://${host}:${DEV_API_PORT}`;
}

/**
 * Validates the configuration embedded by `app.config.ts`. Fails fast: a misconfigured build must
 * not start with silently wrong settings.
 */
export function parseAppConfig(
  source: ExpoConfigSource | null | undefined,
  platform: RuntimePlatform,
): AppConfig {
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
  return {
    appEnv: extra.data.appEnv,
    appVersion: version.data,
    contentApiUrl: resolveContentApiUrl(
      extra.data.appEnv,
      extra.data.apiUrl,
      source.hostUri,
      platform,
    ),
  };
}
