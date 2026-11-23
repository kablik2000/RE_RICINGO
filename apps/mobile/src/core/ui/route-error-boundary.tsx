import { Screen } from '@ricingo/design-system';
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';

import { toAppError } from '../errors';
import { telemetry } from '../telemetry';
import { ErrorView } from './error-view';

/**
 * Rendered by Expo Router when a route throws. Reports the error once and shows a localized,
 * kind-specific message with retry where retrying can help.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // Reporting is a side effect toward an external system, so it belongs in an effect.
  useEffect(() => {
    telemetry.captureError(toAppError(error), { source: 'route-error-boundary' });
  }, [error]);

  return (
    <Screen scrollable={false}>
      <ErrorView
        error={error}
        onRetry={() => {
          void retry();
        }}
      />
    </Screen>
  );
}
