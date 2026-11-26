import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Single source of app configuration. Environment-specific values come from EAS environment
 * variables (`APP_ENV` is set per build profile in eas.json); nothing secret belongs here — every
 * value in `extra` ships inside the app bundle.
 */

// Expo's config loader cannot import TypeScript modules, so the environment list is repeated
// here. `app-config.test.ts` guarantees it stays identical to `src/core/config/app-env.ts`.
const APP_ENVS = ['development', 'preview', 'production'] as const;
type AppEnv = (typeof APP_ENVS)[number];

function isAppEnv(value: unknown): value is AppEnv {
  return APP_ENVS.some((env) => env === value);
}

export function resolveAppEnv(raw: unknown): AppEnv {
  if (raw === undefined || raw === '') {
    return 'development';
  }
  if (!isAppEnv(raw)) {
    throw new Error(
      `Invalid APP_ENV ${JSON.stringify(raw)}. Expected development, preview or production.`,
    );
  }
  return raw;
}

const rawAppEnv: unknown = process.env.APP_ENV;
const appEnv = resolveAppEnv(rawAppEnv);
/** API serving published lessons; optional in development (the app finds the local one). */
// `unknown` + a type check: on CI `process.env` values type as `any` (unlike locally), and
// assigning them as they are fails lint there (no-unsafe-assignment).
const rawApiUrl: unknown = process.env.RICI_API_URL;
const apiUrl = typeof rawApiUrl === 'string' && rawApiUrl !== '' ? rawApiUrl : undefined;

/** Name shown under the app icon and in the app switcher (owner decision 2026-11-23). */
const APP_DISPLAY_NAME = 'Italština RICI';
const APP_NAMES: Readonly<Record<AppEnv, string>> = {
  development: `${APP_DISPLAY_NAME} Dev`,
  preview: `${APP_DISPLAY_NAME} Preview`,
  production: APP_DISPLAY_NAME,
};

/**
 * Application identifier (Android package, iOS bundle ID), on the owner's domain esprog.eu.
 * It cannot change once the app is installed by students (an update must keep it), so never
 * rename it. Non-production variants get a suffix so they can be installed next to the
 * production app.
 */
const BASE_APP_ID = 'eu.esprog.rici';
const APP_ID_SUFFIXES: Readonly<Record<AppEnv, string>> = {
  development: '.dev',
  preview: '.preview',
  production: '',
};
const appId = `${BASE_APP_ID}${APP_ID_SUFFIXES[appEnv]}`;

/** Brand red of italstinarici.cz, as in the app icon. */
const BRAND_RED = '#D2454B';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAMES[appEnv],
  slug: 'ricingo',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'ricingo',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: appId,
    supportsTablet: true,
  },
  android: {
    package: appId,
    adaptiveIcon: {
      backgroundColor: BRAND_RED,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    // Web is used for development previews only; students use iOS/Android (open question Q-4).
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    // Offline lesson store and settings (DEVELOPMENT_PLAN M7).
    'expo-sqlite',
    // Student session token in the Keychain / Keystore; excluded from Android backups (ADR-0013).
    'expo-secure-store',
    // Windows: native Android builds need a CMake whose ninja supports long paths.
    './plugins/with-android-cmake',
    // Release builds signed with the RICI key from ~/.gradle/gradle.properties (never in git).
    './plugins/with-android-release-signing',
    [
      'expo-splash-screen',
      {
        backgroundColor: BRAND_RED,
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv,
    ...(apiUrl !== undefined && { apiUrl }),
  },
});
