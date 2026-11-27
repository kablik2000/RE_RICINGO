import { createMemoryLocalStore } from '../local/local-store';

import { createPracticeProgress } from './practice-progress';

describe('practice progress', () => {
  it('moves answered items to their next review and keeps them in the store', async () => {
    const store = createMemoryLocalStore();
    const progress = createPracticeProgress(store);
    const now = new Date('2026-11-27T10:00:00Z');

    await progress.record(
      [
        { exerciseId: 'a', itemKey: 'vocabulary:al-bar:volere', correct: true },
        { exerciseId: 'b', itemKey: 'vocabulary:al-bar:volere', correct: true },
        { exerciseId: 'c', itemKey: 'grammar:al-bar:vorrei', correct: false },
      ],
      now,
    );
    const reviews = await createPracticeProgress(store).readReviews();

    expect(reviews.get('vocabulary:al-bar:volere')).toMatchObject({ box: 2, correct: 2 });
    expect(reviews.get('grammar:al-bar:vorrei')).toMatchObject({ box: 0, wrong: 1 });
  });
});
