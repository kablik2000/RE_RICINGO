import type { LocalStore } from '../local/local-store';

import { recommendationsSchema, type Recommendation } from './account-api';

const KEY = 'student.recommendations';

/** The last recommendations the server sent, so Home shows them offline (ADR-0013 step 5). */
export interface RecommendationCache {
  /** `null` when nothing (valid) is stored. */
  read(): Promise<readonly Recommendation[] | null>;
  write(recommendations: readonly Recommendation[]): Promise<void>;
  /** Forgets them, e.g. after signing out. */
  clear(): Promise<void>;
}

export function createRecommendationCache(store: LocalStore): RecommendationCache {
  return {
    async read() {
      const raw = await store.readSetting(KEY);
      if (raw === null || raw === '') return null;
      try {
        const parsed = recommendationsSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        // Stored by an older app version in another shape: as if nothing was stored.
        return null;
      }
    },
    write: (recommendations) => store.writeSetting(KEY, JSON.stringify(recommendations)),
    clear: () => store.writeSetting(KEY, ''),
  };
}
