import { openIndexedDbLocalStore } from './indexeddb-local-store';
import { createMemoryLocalStore, type LocalStore } from './local-store';

/**
 * The web app (ADR-0019) keeps lessons, settings and progress in IndexedDB, so it works offline
 * and remembers the student. Browsers without IndexedDB (rare, private modes) fall back to memory.
 */
export function openLocalStore(): LocalStore {
  if (typeof indexedDB === 'undefined') {
    return createMemoryLocalStore();
  }
  // Asks the browser not to evict the data under storage pressure (granted to installed apps).
  // Older Safari and insecure origins have no StorageManager.
  if ('storage' in navigator && 'persist' in navigator.storage) {
    void navigator.storage.persist().catch(() => undefined);
  }
  return openIndexedDbLocalStore(indexedDB);
}
