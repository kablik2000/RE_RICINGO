'use client';

import { useEffect, useId, useRef } from 'react';

import { t } from '@/i18n';

import styles from './confirm-dialog.module.css';
import ui from './ui.module.css';

/**
 * Material 3 confirmation dialog for destructive actions. Used instead of `window.confirm`,
 * which browsers may silence ("prevent this page from creating additional dialogs"): then the
 * action would quietly do nothing.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  // Syncs the native <dialog> (modal, focus trap, Esc) with the `open` prop.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p id={messageId} className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        <button type="button" className={`${ui.button ?? ''} ${ui.text ?? ''}`} onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className={`${ui.button ?? ''} ${ui.filled ?? ''}`}
          onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
