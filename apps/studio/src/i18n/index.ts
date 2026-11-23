import { cs } from './cs';

type LeafPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : LeafPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = LeafPaths<typeof cs>;

function lookup(key: string): string | undefined {
  let node: unknown = cs;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** UI string for `key`, type-checked against the Czech catalog. */
export function t(key: TranslationKey): string {
  return lookup(key) ?? key;
}
