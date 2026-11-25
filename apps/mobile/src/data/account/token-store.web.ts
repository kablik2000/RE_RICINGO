import type { TokenStore } from './token-store';

export type { TokenStore } from './token-store';

/**
 * Web is a development preview only (Q-4) and has no secure storage: the session lives in memory
 * and ends with the page. Also used by the tests.
 */
export function openTokenStore(): TokenStore {
  let token: string | null = null;
  return {
    read: () => Promise.resolve(token),
    write(value) {
      token = value;
      return Promise.resolve();
    },
    clear() {
      token = null;
      return Promise.resolve();
    },
  };
}
