'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';

import { inviteAction, type InviteState } from '../actions';
import styles from '../students.module.css';

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(inviteAction, {});
  const [isMinor, setIsMinor] = useState(state.values?.isMinor ?? false);

  return (
    <form action={formAction} className={`${ui.card ?? ''} ${styles.form ?? ''}`}>
      <label className={ui.field}>
        <span>{t('students.form.name')}</span>
        <input
          className={ui.input}
          name="displayName"
          autoComplete="off"
          defaultValue={state.values?.displayName}
          required
          maxLength={200}
        />
      </label>
      <label className={ui.field}>
        <span>{t('students.form.email')}</span>
        <input
          className={ui.input}
          type="email"
          name="email"
          autoComplete="off"
          defaultValue={state.values?.email}
          required
          maxLength={254}
        />
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          name="isMinor"
          checked={isMinor}
          onChange={(event) => {
            setIsMinor(event.target.checked);
          }}
        />
        <span>{t('students.form.isMinor')}</span>
      </label>
      {isMinor && (
        <div className={styles.consent}>
          <p className={ui.muted}>{t('students.form.consentInfo')}</p>
          <label className={styles.check}>
            <input type="checkbox" name="parentalConsent" required />
            <span>{t('students.form.consent')}</span>
          </label>
        </div>
      )}
      {state.error !== undefined && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      <div className={ui.actions}>
        <Link href="/students" className={`${ui.button ?? ''} ${ui.text ?? ''}`}>
          {t('common.cancel')}
        </Link>
        <button
          type="submit"
          className={`${ui.button ?? ''} ${ui.filled ?? ''}`}
          disabled={pending}>
          <Icon name="send" size={18} />
          {pending ? t('students.form.sending') : t('students.form.send')}
        </button>
      </div>
    </form>
  );
}
