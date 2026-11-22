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

const APP_NAMES: Readonly<Record<AppEnv, string>> = {
  development: 'RICINGO Dev',
  preview: 'RICINGO Preview',
  production: 'RICINGO',
};

/** Provisional brand red (see packages/design-system palette, open question Q-10). */
const SPLASH_BACKGROUND = '#B3122E';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAMES[appEnv],
  slug: 'ricingo',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'ricingo',
  userInterfaceStyle: 'automatic',
  // Bundle identifiers are set when the EAS project is created (blocked on Q-16: account ownership).
  icon: './assets/images/icon.png',
  ios: {
    icon: './assets/expo.icon',
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
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
    [
      'expo-splash-screen',
      {
        backgroundColor: SPLASH_BACKGROUND,
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv,
  },
});
