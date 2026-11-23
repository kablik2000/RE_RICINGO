import type { LocalStore } from '../local/local-store';
import { DEFAULT_UPDATE_POLICY, isUpdatePolicy, type UpdatePolicy } from './update-rules';

const POLICY_KEY = 'lessonUpdates.policy';

/** The student's "Aktualizace lekcí" choice, stored on the device. */
export interface UpdateSettings {
  getPolicy(): Promise<UpdatePolicy>;
  setPolicy(policy: UpdatePolicy): Promise<void>;
}

export function createUpdateSettings(store: LocalStore): UpdateSettings {
  return {
    async getPolicy() {
      const stored = await store.readSetting(POLICY_KEY);
      return isUpdatePolicy(stored) ? stored : DEFAULT_UPDATE_POLICY;
    },
    setPolicy: (policy) => store.writeSetting(POLICY_KEY, policy),
  };
}
