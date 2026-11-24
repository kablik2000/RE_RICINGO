'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';

import { removeStudentAction, resendAction, revokeAction, type ActionResult } from './actions';
import styles from './students.module.css';

function useRowAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = (action: () => Promise<ActionResult>, done: string) => {
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? done : result.message);
      // Also drops "?invited=1", so the notice about the last invitation does not linger.
      router.replace('/students');
      router.refresh();
    });
  };
  return { pending, message, run };
}

/** "Poslat znovu" and "Zrušit" for an open invitation. */
export function InvitationActions({ id, email }: { id: string; email: string }) {
  const { pending, message, run } = useRowAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={styles.rowActions}>
      <button
        type="button"
        className={`${ui.button ?? ''} ${ui.text ?? ''}`}
        disabled={pending}
        onClick={() => {
          run(() => resendAction(id), t('students.resent', { email }));
        }}>
        <Icon name="forward_to_inbox" size={18} />
        {t('students.resend')}
      </button>
      <button
        type="button"
        className={ui.iconButton}
        aria-label={t('students.revoke')}
        title={t('students.revoke')}
        disabled={pending}
        onClick={() => {
          setConfirming(true);
        }}>
        <Icon name="close" size={18} />
      </button>
      {message !== null && (
        <span role="status" className={styles.rowMessage}>
          {message}
        </span>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('students.revokeDialog.title', { email })}
        message={t('students.revokeDialog.message')}
        confirmLabel={t('students.revoke')}
        onConfirm={() => {
          setConfirming(false);
          run(() => revokeAction(id), t('students.revoked'));
        }}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </div>
  );
}

/** "Odebrat" for a student, with a confirmation. */
export function StudentActions({ id, name }: { id: string; name: string }) {
  const { pending, message, run } = useRowAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={styles.rowActions}>
      <button
        type="button"
        className={`${ui.button ?? ''} ${ui.text ?? ''}`}
        disabled={pending}
        onClick={() => {
          setConfirming(true);
        }}>
        <Icon name="person_remove" size={18} />
        {t('students.remove')}
      </button>
      {message !== null && (
        <span role="status" className={styles.rowMessage}>
          {message}
        </span>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('students.removeDialog.title', { name })}
        message={t('students.removeDialog.message')}
        confirmLabel={t('students.remove')}
        onConfirm={() => {
          setConfirming(false);
          run(() => removeStudentAction(id), t('students.removed'));
        }}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </div>
  );
}
