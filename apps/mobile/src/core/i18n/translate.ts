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

/**
 * Returns the UI string for `key` (type-checked against the catalog), replacing `{name}`
 * placeholders with `params`. Unknown placeholders stay visible so they are caught in review.
 * Czech plural rules will be added with the first string that needs them.
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const template = messages.get(key) ?? key;
  if (params === undefined) {
    return template;
  }
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

/** The flattened catalog (key → string); used by tests to validate completeness. */
export function allTranslations(): ReadonlyMap<string, string> {
  return messages;
}
