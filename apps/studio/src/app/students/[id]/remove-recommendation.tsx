'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';

import { removeRecommendationAction } from './actions';
import styles from './student.module.css';

/** The remove button of one recommendation, with a confirmation. */
export function RemoveRecommendation({
  studentId,
  recommendationId,
}: {
  studentId: string;
  recommendationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className={styles.itemActions}>
      <button
        type="button"
        className={ui.iconButton}
        aria-label={t('student.item.remove')}
        title={t('student.item.remove')}
        disabled={pending}
        onClick={() => {
          setConfirming(true);
        }}>
        <Icon name="delete" size={20} />
      </button>
      {message !== null && (
        <span role="alert" className={styles.error}>
          {message}
        </span>
      )}
      <ConfirmDialog
        open={confirming}
        title={t('student.item.removeDialog.title')}
        message={t('student.item.removeDialog.message')}
        confirmLabel={t('student.item.remove')}
        onConfirm={() => {
          setConfirming(false);
          startTransition(async () => {
            const result = await removeRecommendationAction(studentId, recommendationId);
            setMessage(result.ok ? null : result.message);
            router.refresh();
          });
        }}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </div>
  );
}
