'use client';

import { Icon } from '@/components/icon';
import { VISIBILITY_ICON } from '@/components/visibility-chip';
import { t } from '@/i18n';
import type { Visibility } from '@/lib/studio-api';

import styles from './editor.module.css';

const OPTIONS: readonly Visibility[] = ['public', 'students'];

/** Segmented control "Pro všechny / Jen pro mé studenty" in the editor header (ADR-0013). */
export function VisibilitySwitch({
  value,
  disabled,
  onChange,
}: {
  value: Visibility;
  disabled: boolean;
  onChange: (visibility: Visibility) => void;
}) {
  return (
    <div role="radiogroup" aria-label={t('visibility.label')} className={styles.segmented}>
      {OPTIONS.map((option) => {
        const checked = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            aria-label={t(`visibility.${option}.short`)}
            title={t(`visibility.${option}.hint`)}
            className={styles.segment}
            onClick={() => {
              if (!checked) onChange(option);
            }}>
            <Icon name={checked ? 'check' : VISIBILITY_ICON[option]} size={18} />
            {t(`visibility.${option}.short`)}
          </button>
        );
      })}
    </div>
  );
}
