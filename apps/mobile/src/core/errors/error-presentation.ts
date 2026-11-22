import type { TranslationKey } from '../i18n';
import type { AppErrorKind } from './app-error';

export interface ErrorPresentation {
  titleKey: TranslationKey;
  messageKey: TranslationKey;
  /** Whether offering "try again" can plausibly help. */
  retryable: boolean;
}

const presentations: Readonly<Record<AppErrorKind, ErrorPresentation>> = {
  network: {
    titleKey: 'errors.network.title',
    messageKey: 'errors.network.message',
    retryable: true,
  },
  auth: { titleKey: 'errors.auth.title', messageKey: 'errors.auth.message', retryable: false },
  forbidden: {
    titleKey: 'errors.forbidden.title',
    messageKey: 'errors.forbidden.message',
    retryable: false,
  },
  notFound: {
    titleKey: 'errors.notFound.title',
    messageKey: 'errors.notFound.message',
    retryable: false,
  },
  validation: {
    titleKey: 'errors.validation.title',
    messageKey: 'errors.validation.message',
    retryable: false,
  },
  conflict: {
    titleKey: 'errors.conflict.title',
    messageKey: 'errors.conflict.message',
    retryable: true,
  },
  unexpected: {
    titleKey: 'errors.unexpected.title',
    messageKey: 'errors.unexpected.message',
    retryable: true,
  },
};

export function getErrorPresentation(kind: AppErrorKind): ErrorPresentation {
  return presentations[kind];
}
