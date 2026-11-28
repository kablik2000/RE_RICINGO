import { getNetworkStateAsync } from 'expo-network';
import { Platform } from 'react-native';

import { getAppConfig } from '@/core/config';
import { telemetry } from '@/core/telemetry';

import { createAccountApi, type AccountApi } from './account/account-api';
import {
  createRecommendationCache,
  type RecommendationCache,
} from './account/recommendation-cache';
import { openTokenStore, type TokenStore } from './account/token-store';
import { createContentApi } from './content/content-api';
import { createContentSync, type ContentSync } from './content/content-sync';
import { createLessonHolds, type LessonHolds } from './content/lesson-holds';
import { toConnectionKind } from './content/update-rules';
import { createUpdateSettings, type UpdateSettings } from './content/update-settings';
import alBar from './demo/al-bar.lesson.json';
import { createLessonLibrary, toSeed, type LessonLibrary } from './lesson-library';
import { openLocalStore } from './local/open-local-store';
import { createPracticeProgress, type PracticeProgress } from './practice/practice-progress';

/** Everything the data hooks use; tests replace parts through `DataProvider`. */
export interface DataServices {
  library: LessonLibrary;
  holds: LessonHolds;
  updateSettings: UpdateSettings;
  /** `null` when this build downloads no lessons (web preview, no API configured). */
  contentSync: ContentSync | null;
  /** Student accounts (ADR-0013); `null` without a server, like `contentSync`. */
  account: AccountApi | null;
  /** The signed-in student's session token. */
  tokens: TokenStore;
  /** The lecturer's recommendations last received, for offline use. */
  recommendationCache: RecommendationCache;
  /** What the student practised and when each item is due again (on the device, ADR-0017). */
  practice: PracticeProgress;
}

/** Lessons shipped inside the app: available offline from the very first start. */
const BUNDLED_LESSONS: readonly unknown[] = [alBar];

/** Composition root of the data layer. */
export function createDataServices(): DataServices {
  const store = openLocalStore();
  const library = createLessonLibrary(store, () => BUNDLED_LESSONS.map(toSeed));
  const holds = createLessonHolds();
  const updateSettings = createUpdateSettings(store);
  const apiUrl = getAppConfig().contentApiUrl;
  const tokens = openTokenStore();
  const contentSync =
    apiUrl === null
      ? null
      : createContentSync({
          api: createContentApi(apiUrl, fetch, () => tokens.read()),
          library,
          holds,
          getConnection: async () => {
            const kind = toConnectionKind(await getNetworkStateAsync());
            // Browsers cannot tell Wi-Fi from mobile data; lessons are small, so the web app
            // (ADR-0019) downloads them on any connection, like on Wi-Fi.
            return Platform.OS === 'web' && kind === 'metered' ? 'unmetered' : kind;
          },
          getPolicy: () => updateSettings.getPolicy(),
          telemetry,
        });
  const account = apiUrl === null ? null : createAccountApi(apiUrl);
  const practice = createPracticeProgress(store);
  const recommendationCache = createRecommendationCache(store);
  return {
    library,
    holds,
    updateSettings,
    contentSync,
    account,
    tokens,
    practice,
    recommendationCache,
  };
}

let appServices: DataServices | null = null;

/** The app's single set of services (one database, one update engine). */
export function getAppServices(): DataServices {
  appServices ??= createDataServices();
  return appServices;
}
