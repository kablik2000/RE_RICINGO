import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { parseAppConfig, type AppConfig } from './app-config';

export type { AppConfig } from './app-config';
export type { AppEnv } from './app-env';

let cached: AppConfig | null = null;

/** Validated configuration of the running build (read on first use). */
export function getAppConfig(): AppConfig {
  cached ??= parseAppConfig(Constants.expoConfig, { os: Platform.OS });
  return cached;
}
