import { cs } from './cs';

type LeafPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : LeafPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = LeafPaths<typeof cs>;
export type TranslationParams = Readonly<Record<string, string | number>>;

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

/** UI string for `key` (type-checked against the Czech catalog); `{name}` placeholders filled. */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const template = lookup(key) ?? key;
  if (params === undefined) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}
