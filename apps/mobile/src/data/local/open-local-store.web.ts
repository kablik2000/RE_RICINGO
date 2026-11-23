import { createMemoryLocalStore, type LocalStore } from './local-store';

/**
 * Web is a development preview only (Q-4): lessons live in memory and come from the app bundle,
 * so the preview needs no SQLite WebAssembly setup.
 */
export function openLocalStore(): LocalStore {
  return createMemoryLocalStore();
}
