import { cs } from './cs';

/** Dot-separated paths to every string leaf of a catalog, e.g. `"lessons.empty.title"`. */
type LeafPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : LeafPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = LeafPaths<typeof cs>;

type CatalogNode = Readonly<Record<string, unknown>>;

function isCatalogNode(value: unknown): value is CatalogNode {
  return typeof value === 'object' && value !== null;
}

function flatten(
  node: CatalogNode,
  prefix: string,
  into: Map<string, string>,
): Map<string, string> {
  for (const [key, value] of Object.entries(node)) {
    const path = `${prefix}${key}`;
    if (typeof value === 'string') {
      into.set(path, value);
    } else if (isCatalogNode(value)) {
      flatten(value, `${path}.`, into);
    }
  }
  return into;
}

const messages = flatten(cs, '', new Map());

export type TranslationParams = Readonly<Record<string, string | number>>;

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, params: TranslationParams | undefined): string {
  if (params === undefined) {
    return template;
  }
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

/**
 * Returns the UI string for `key` (type-checked against the catalog), replacing `{name}`
 * placeholders with `params`. Unknown placeholders stay visible so they are caught in review.
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  return interpolate(messages.get(key) ?? key, params);
}

/** Catalog nodes with Czech plural forms `{ one, few, other }`, e.g. `"lessons.count"`. */
export type PluralKey = TranslationKey extends infer K
  ? K extends `${infer Base}.one`
    ? Base
    : never
  : never;

export type PluralForm = 'one' | 'few' | 'other';

/** Czech cardinal plural category: 1 → one; 2–4 → few; 0, 5+ and fractions → other. */
export function czechPluralForm(count: number): PluralForm {
  if (count === 1) {
    return 'one';
  }
  return Number.isInteger(count) && count >= 2 && count <= 4 ? 'few' : 'other';
}

/** Plural-aware `t`: picks the form for `count` and fills `{count}` (plus any `params`). */
export function tPlural(key: PluralKey, count: number, params?: TranslationParams): string {
  const path = `${key}.${czechPluralForm(count)}`;
  return interpolate(messages.get(path) ?? path, { ...params, count });
}

/** The flattened catalog (key → string); used by tests to validate completeness. */
export function allTranslations(): ReadonlyMap<string, string> {
  return messages;
}
