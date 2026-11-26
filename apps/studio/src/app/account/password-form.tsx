'use client';

import { useActionState } from 'react';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';

import styles from './account.module.css';
import { changePasswordAction, type PasswordState } from './actions';

export function PasswordForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(
    changePasswordAction,
    {},
  );
  return (
    // A new `key` after a successful change empties the fields.
    <form
      key={state.changed === true ? 'changed' : 'form'}
      action={formAction}
      className={styles.form}>
      {/* Lets password managers store the new password for the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <label className={ui.field}>
        <span>{t('account.currentPassword')}</span>
        {/* Typed by the lecturer, never filled in by the browser's password manager: the change
            must be confirmed by someone who knows the password, not by whoever has the browser
            open. Browsers do not autofill read-only fields; it becomes editable on focus. */}
        <input
          className={ui.input}
          type="password"
          name="currentPassword"
          autoComplete="off"
          readOnly
          onFocus={(event) => {
            event.currentTarget.readOnly = false;
          }}
          required
        />
      </label>
      <label className={ui.field}>
        <span>{t('account.newPassword')}</span>
        <input
          className={ui.input}
          type="password"
          name="newPassword"
          autoComplete="new-password"
          minLength={15}
          maxLength={128}
          required
        />
      </label>
      <label className={ui.field}>
        <span>{t('account.repeatPassword')}</span>
        <input
          className={ui.input}
          type="password"
          name="repeatPassword"
          autoComplete="new-password"
          minLength={15}
          maxLength={128}
          required
        />
      </label>
      {state.error !== undefined && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      {state.changed === true && (
        <p role="status" className={styles.notice}>
          {t('account.changed')}
        </p>
      )}
      <div className={ui.actions}>
        <button
          type="submit"
          className={`${ui.button ?? ''} ${ui.filled ?? ''}`}
          disabled={pending}>
          <Icon name="key" size={18} />
          {pending ? t('account.submitting') : t('account.submit')}
        </button>
      </div>
    </form>
  );
}
