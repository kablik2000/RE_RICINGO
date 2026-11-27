import type { LessonBundle } from '../content/lesson-bundle';

import { generateExercises, type Exercise, type PracticeKind, PRACTICE_KINDS } from './exercises';
import { shuffle, type Random } from './random';

/**
 * How well the student knows one practised item (Leitner boxes, ADR-0017): a right answer moves
 * it to the next box and a longer pause, a wrong one back to the start. FSRS may replace this
 * later (M10) behind the same functions.
 */
export interface ReviewState {
  itemKey: string;
  /** 0 = learning; higher boxes come back later. */
  box: number;
  /** ISO time from which the item is due again. */
  dueAt: string;
  correct: number;
  wrong: number;
  lastAnsweredAt: string;
}

/** Pause before an item in each box is due again, in days. */
export const REVIEW_INTERVAL_DAYS: readonly number[] = [0, 1, 3, 7, 14, 30, 60];
const DAY_MS = 24 * 60 * 60 * 1000;

export function review(
  previous: ReviewState | undefined,
  itemKey: string,
  correct: boolean,
  now: Date,
): ReviewState {
  const lastBox = REVIEW_INTERVAL_DAYS.length - 1;
  const box = correct ? Math.min((previous?.box ?? 0) + 1, lastBox) : 0;
  return {
    itemKey,
    box,
    dueAt: new Date(now.getTime() + (REVIEW_INTERVAL_DAYS[box] ?? 0) * DAY_MS).toISOString(),
    correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
    wrong: (previous?.wrong ?? 0) + (correct ? 0 : 1),
    lastAnsweredAt: now.toISOString(),
  };
}

/** New items and items whose pause is over. */
export function isDue(state: ReviewState | undefined, now: Date): boolean {
  return state === undefined || Date.parse(state.dueAt) <= now.getTime();
}

/** What to practise: one kind, optionally one lesson and one grammar topic. */
export interface PracticeFilter {
  kind: PracticeKind;
  lessonId?: string;
  grammarTopicId?: string;
}

function matches(exercise: Exercise, filter: PracticeFilter): boolean {
  return (
    (filter.lessonId === undefined || exercise.lessonId === filter.lessonId) &&
    (filter.grammarTopicId === undefined ||
      exercise.grammarTopicIds.includes(filter.grammarTopicId))
  );
}

/** Every exercise the lessons offer for the filter, one per practised item. */
export function practiceCandidates(
  bundles: readonly LessonBundle[],
  filter: PracticeFilter,
  random: Random = Math.random,
): Exercise[] {
  const seen = new Set<string>();
  return bundles
    .filter((bundle) => filter.lessonId === undefined || bundle.lesson.id === filter.lessonId)
    .flatMap((bundle) => generateExercises(bundle, filter.kind, random))
    .filter((exercise) => {
      if (!matches(exercise, filter) || seen.has(exercise.itemKey)) return false;
      seen.add(exercise.itemKey);
      return true;
    });
}

export const SESSION_SIZE = 10;

/**
 * A practice session: due items first (new and forgotten ones before those whose pause ended
 * longest ago), topped up with the items due soonest, in random order.
 */
export function planSession(
  candidates: readonly Exercise[],
  reviews: ReadonlyMap<string, ReviewState>,
  random: Random = Math.random,
  size: number = SESSION_SIZE,
): Exercise[] {
  const order = (exercise: Exercise) => {
    const state = reviews.get(exercise.itemKey);
    return state === undefined ? Number.NEGATIVE_INFINITY : Date.parse(state.dueAt);
  };
  // Shuffle first, so items with the same urgency (all new ones) come in a different order.
  const chosen = shuffle(candidates, random)
    .sort((a, b) => order(a) - order(b))
    .slice(0, size);
  return shuffle(chosen, random);
}

/** How many items of each kind are due, per lesson (the practice overview). */
export interface PracticeCounts {
  /** Items the lesson offers for practice. */
  total: number;
  due: number;
}

export function countPractice(
  bundles: readonly LessonBundle[],
  reviews: ReadonlyMap<string, ReviewState>,
  now: Date,
): Record<PracticeKind, PracticeCounts> {
  const counts = Object.fromEntries(
    PRACTICE_KINDS.map((kind) => [kind, { total: 0, due: 0 }]),
  ) as Record<PracticeKind, PracticeCounts>;
  for (const kind of PRACTICE_KINDS) {
    const candidates = practiceCandidates(bundles, { kind }, () => 0);
    counts[kind] = {
      total: candidates.length,
      due: candidates.filter((exercise) => isDue(reviews.get(exercise.itemKey), now)).length,
    };
  }
  return counts;
}
