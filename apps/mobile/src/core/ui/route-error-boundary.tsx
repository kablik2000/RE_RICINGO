import { ErrorState, Screen } from '@ricingo/design-system';
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';

import { getErrorPresentation, toAppError } from '../errors';
import { t } from '../i18n';
import { telemetry } from '../telemetry';

/**
 * Rendered by Expo Router when a route throws. Reports the error once and shows a localized,
 * kind-specific message with retry where retrying can help.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // Reporting is a side effect toward an external system, so it belongs in an effect.
  useEffect(() => {
    telemetry.captureError(toAppError(error), { source: 'route-error-boundary' });
  }, [error]);

  const presentation = getErrorPresentation(toAppError(error).kind);

  return (
    <Screen scrollable={false}>
      <ErrorState
        title={t(presentation.titleKey)}
        message={t(presentation.messageKey)}
        {...(presentation.retryable && {
          retry: {
            label: t('common.retry'),
            onPress: () => {
              void retry();
            },
          },
        })}
      />
    </Screen>
  );
}
