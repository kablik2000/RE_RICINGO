import { review, type PracticeResult, type ReviewState } from '@ricingo/domain';

import type { LocalStore } from '../local/local-store';

/** The student's practice progress, kept on the device (ADR-0017). Rejects with `AppError`s. */
export interface PracticeProgress {
  /** Review state per practised item key. */
  readReviews(): Promise<ReadonlyMap<string, ReviewState>>;
  /** Moves every answered item to its next review (in answer order) and saves it. */
  record(results: readonly PracticeResult[], now: Date): Promise<void>;
}

export function createPracticeProgress(store: LocalStore): PracticeProgress {
  const readReviews = async () =>
    new Map((await store.readReviews()).map((state) => [state.itemKey, state]));
  return {
    readReviews,
    async record(results, now) {
      if (results.length === 0) return;
      const reviews = await readReviews();
      const changed = new Map<string, ReviewState>();
      for (const result of results) {
        const next = review(reviews.get(result.itemKey), result.itemKey, result.correct, now);
        reviews.set(result.itemKey, next);
        changed.set(result.itemKey, next);
      }
      await store.saveReviews([...changed.values()]);
    },
  };
}
