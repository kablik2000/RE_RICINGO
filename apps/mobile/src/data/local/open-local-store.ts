import type { LocalStore } from './local-store';
import { openSqliteLocalStore } from './sqlite-local-store';

/** iOS and Android keep lessons in SQLite (`open-local-store.web.ts` for web previews). */
export function openLocalStore(): LocalStore {
  return openSqliteLocalStore();
}
