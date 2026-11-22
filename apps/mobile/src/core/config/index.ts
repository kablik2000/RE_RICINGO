import Constants from 'expo-constants';

import { parseAppConfig, type AppConfig } from './app-config';

export type { AppConfig } from './app-config';
export type { AppEnv } from './app-env';

/** Validated configuration of the running build. */
export const appConfig: AppConfig = parseAppConfig(Constants.expoConfig);
