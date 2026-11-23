import type { Route } from 'next';

/** A path of this Studio: one leading slash, then no slash or backslash, and no whitespace. */
const LOCAL_PATH = /^\/(?![/\\])[^\s\\]*$/;

/**
 * Where to go after signing in: only a path of this Studio (`/lessons/…`), never another site
 * (`//evil.example`, `/\evil.example`, `https://…`) — no open redirect.
 */
export function safeNextPath(value: unknown): Route {
  // A repeated query parameter arrives as an array; anything but one string is ignored.
  if (typeof value !== 'string') return '/';
  // Checked above to be a local path; typed routes cannot know which one at compile time.
  return LOCAL_PATH.test(value) && !value.startsWith('/login') ? (value as Route) : '/';
}
