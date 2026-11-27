import { sameText } from './text';

/** A source of numbers in [0, 1), like `Math.random`; tests pass a seeded one. */
export type Random = () => number;

/** Deterministic generator (mulberry32) for tests and reproducible sessions. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const item = result[index] as T;
    result[index] = result[other] as T;
    result[other] = item;
  }
  return result;
}

/**
 * Up to `count` texts, drawn from the pools in order (the first pool is preferred), that differ
 * from `answer`, from `taken` and from each other — ignoring case and punctuation, so "Buongiorno!"
 * never sits next to "Buongiorno." as if they were different answers.
 */
export function pickDistinct(
  pools: readonly (readonly string[])[],
  answer: string,
  count: number,
  random: Random,
  taken: readonly string[] = [],
): string[] {
  const picked: string[] = [];
  const blocked = [answer, ...taken];
  for (const pool of pools) {
    for (const text of shuffle(pool, random)) {
      if (picked.length >= count) return picked;
      if (text.trim() === '' || [...blocked, ...picked].some((other) => sameText(other, text))) {
        continue;
      }
      picked.push(text);
    }
  }
  return picked;
}
