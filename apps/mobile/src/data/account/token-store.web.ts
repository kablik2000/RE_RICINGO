import type { TokenStore } from './token-store';

export type { TokenStore } from './token-store';

const KEY = 'rici.student.session';

/**
 * The web app (ADR-0019) keeps the session in `localStorage`, so the student stays signed in after
 * closing the page. A strict Content Security Policy guards it against injected scripts. Without
 * `localStorage` (tests, some private modes) the session lives in memory and ends with the page.
 */
export function openTokenStore(): TokenStore {
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  let token: string | null = null;
  return {
    read: () => Promise.resolve(storage === null ? token : storage.getItem(KEY)),
    write(value) {
      if (storage === null) token = value;
      else storage.setItem(KEY, value);
      return Promise.resolve();
    },
    clear() {
      if (storage === null) token = null;
      else storage.removeItem(KEY);
      return Promise.resolve();
    },
  };
}
