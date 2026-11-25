import * as SecureStore from 'expo-secure-store';

import { AppError } from '@/core/errors';

/** Where the student's session token is kept on the device (ADR-0013). */
export interface TokenStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'rici.student.session';
/**
 * Readable after the first unlock (background update checks need it) and never moved to another
 * device through a backup: a restored phone signs in again (and counts as a new device).
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function guarded<T>(action: string, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    throw new AppError('unexpected', `Secure storage could not ${action}.`, { cause: error });
  }
}

/** The Keychain (iOS) / Keystore-encrypted storage (Android). */
export function openTokenStore(): TokenStore {
  return {
    read: () => guarded('read the session', () => SecureStore.getItemAsync(KEY, OPTIONS)),
    write: (token) =>
      guarded('save the session', () => SecureStore.setItemAsync(KEY, token, OPTIONS)),
    clear: () => guarded('remove the session', () => SecureStore.deleteItemAsync(KEY, OPTIONS)),
  };
}
