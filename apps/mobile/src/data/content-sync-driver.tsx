import { addNetworkStateListener } from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { toConnectionKind, type ConnectionKind } from './content/update-rules';
import { useDataServices } from './query-provider';

/** Returning to the app checks again when the last check is older than this. */
const RECHECK_AFTER_MS = 15 * 60 * 1000;

/**
 * Decides when to look for lesson updates (Q-18): at start, when the app returns to the
 * foreground after a while, and when the connection changes (e.g. Wi-Fi arrives, so offered
 * updates can download on their own). Rendered once, in the root layout.
 */
export function ContentSyncDriver() {
  const { contentSync } = useDataServices();

  // Subscribes to app-state and network events (external systems) for the app's lifetime.
  useEffect(() => {
    if (contentSync === null) {
      return undefined;
    }
    void contentSync.check();

    const appState = AppState.addEventListener('change', (next) => {
      const last = contentSync.getState().lastCheckedAt;
      if (next === 'active' && (last === null || Date.now() - last > RECHECK_AFTER_MS)) {
        void contentSync.check();
      }
    });

    let previous: ConnectionKind | null = null;
    const network = addNetworkStateListener((event) => {
      const current = toConnectionKind(event);
      if (previous !== null && current !== previous && current !== 'offline') {
        void contentSync.check();
      }
      previous = current;
    });

    return () => {
      appState.remove();
      network.remove();
    };
  }, [contentSync]);

  return null;
}
