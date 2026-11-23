'use client';

import { useActionState } from 'react';

import ui from '@/components/ui.module.css';
import { t } from '@/i18n';

import { loginAction, type LoginState } from './actions';
import styles from './login.module.css';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />
      <label className={ui.field}>
        <span>{t('login.email')}</span>
        <input
          className={ui.input}
          type="email"
          name="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          autoFocus
        />
      </label>
      <label className={ui.field}>
        <span>{t('login.password')}</span>
        <input
          className={ui.input}
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state.error !== undefined && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        className={`${ui.button ?? ''} ${ui.filled ?? ''} ${styles.submit ?? ''}`}
        disabled={pending}>
        {pending ? t('login.submitting') : t('login.submit')}
      </button>
    </form>
  );
}
