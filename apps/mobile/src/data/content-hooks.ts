import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';

import type { ContentSync, ContentSyncState } from './content/content-sync';
import type { UpdatePolicy } from './content/update-rules';
import { settingsQueryKeys } from './query-keys';
import { useDataServices } from './query-provider';

const DISABLED_STATE: ContentSyncState = {
  phase: 'idle',
  offered: [],
  lastCheckedAt: null,
  error: null,
};

const noSubscription = () => () => undefined;
const disabledState = () => DISABLED_STATE;

export interface LessonUpdates {
  /** `false` when this build downloads no lessons. */
  enabled: boolean;
  state: ContentSyncState;
  check: () => void;
  downloadOffered: () => void;
  dismissOffer: () => void;
}

/** Lesson update state for banners and settings, plus the student's actions. */
export function useLessonUpdates(): LessonUpdates {
  const { contentSync } = useDataServices();
  const state = useSyncExternalStore(
    contentSync?.subscribe ?? noSubscription,
    contentSync?.getState ?? disabledState,
  );
  const act = useCallback(
    (action: (sync: ContentSync) => void) => () => {
      if (contentSync !== null) {
        action(contentSync);
      }
    },
    [contentSync],
  );
  return {
    enabled: contentSync !== null,
    state,
    check: act((sync) => void sync.check({ manual: true })),
    downloadOffered: act((sync) => void sync.downloadOffered()),
    dismissOffer: act((sync) => {
      sync.dismissOffer();
    }),
  };
}

export function useUpdatePolicy() {
  const { updateSettings } = useDataServices();
  return useQuery({
    queryKey: settingsQueryKeys.updatePolicy(),
    queryFn: () => updateSettings.getPolicy(),
  });
}

/** Saves the policy, then checks again so e.g. "Vždy automaticky" downloads waiting offers. */
export function useSetUpdatePolicy() {
  const { updateSettings, contentSync } = useDataServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policy: UpdatePolicy) => updateSettings.setPolicy(policy),
    onSuccess: (_result, policy) => {
      queryClient.setQueryData(settingsQueryKeys.updatePolicy(), policy);
      void contentSync?.check();
    },
  });
}
