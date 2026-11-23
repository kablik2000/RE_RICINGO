import { ErrorState } from '@ricingo/design-system';

import { getErrorPresentation, toAppError } from '../errors';
import { t } from '../i18n';

export interface ErrorViewProps {
  error: unknown;
  /** Offered only when the error kind is retryable. */
  onRetry?: () => void;
}

/** Localized, kind-specific error message for any thrown value. */
export function ErrorView({ error, onRetry }: ErrorViewProps) {
  const presentation = getErrorPresentation(toAppError(error).kind);
  return (
    <ErrorState
      title={t(presentation.titleKey)}
      message={t(presentation.messageKey)}
      {...(presentation.retryable &&
        onRetry !== undefined && {
          retry: { label: t('common.retry'), onPress: onRetry },
        })}
    />
  );
}
