import { getErrorPresentation, toAppError } from '@/core/errors';
import { t } from '@/core/i18n';
import { AccountError } from '@/data';

/** What to tell the student about a failed account action. */
export function accountErrorMessage(error: unknown): string {
  if (error instanceof AccountError) {
    if (error.code === 'too_many_attempts') {
      const minutes = Math.max(1, Math.ceil((error.retryAfter ?? 60) / 60));
      return t('account.errors.too_many_attempts', { minutes });
    }
    return t(`account.errors.${error.code}`);
  }
  return t(getErrorPresentation(toAppError(error).kind).messageKey);
}
