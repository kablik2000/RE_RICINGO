import type { IconName } from '@ricingo/design-system';
import { PRACTICE_KINDS, type PracticeCounts, type PracticeKind } from '@ricingo/domain';

import { t, tPlural } from '@/core/i18n';

export const KIND_ICONS: Readonly<Record<PracticeKind, IconName>> = {
  vocabulary: 'sync',
  dialogue: 'conversation',
  listening: 'headphones',
  grammar: 'grammar',
  translation: 'translate',
};

export function isPracticeKind(value: string | undefined): value is PracticeKind {
  return PRACTICE_KINDS.some((kind) => kind === value);
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
