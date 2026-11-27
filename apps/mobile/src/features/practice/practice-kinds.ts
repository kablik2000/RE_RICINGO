import type { IconName } from '@ricingo/design-system';
import {
  PRACTICE_KINDS,
  type PracticeCounts,
  type PracticeKind,
  type PracticeSelection,
} from '@ricingo/domain';

import { t, tPlural } from '@/core/i18n';

export const KIND_ICONS: Readonly<Record<PracticeKind, IconName>> = {
  vocabulary: 'sync',
  dialogue: 'conversation',
  listening: 'headphones',
  grammar: 'grammar',
  translation: 'translate',
};

/** A practice kind or `mixed` (all kinds of a lesson), as in the session route. */
export function isPracticeSelection(value: string | undefined): value is PracticeSelection {
  return value === 'mixed' || PRACTICE_KINDS.some((kind) => kind === value);
}

/** "12 slovíček k procvičení", or that everything due today is done. */
export function dueLabel(kind: PracticeKind, counts: PracticeCounts): string {
  if (counts.due === 0) return t('practice.allDone');
  const key =
    kind === 'vocabulary'
      ? 'practice.due.vocabulary'
      : kind === 'grammar'
        ? 'practice.due.exercises'
        : 'practice.due.sentences';
  return tPlural(key, counts.due);
}
