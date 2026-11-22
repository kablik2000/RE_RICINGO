import { EmptyState, Screen } from '@ricingo/design-system';

import { t } from '@/core/i18n';

/** Shell: shows the empty state until lessons data is wired in (see DEVELOPMENT_PLAN). */
export function LessonsScreen() {
  return (
    <Screen title={t('lessons.title')} scrollable={false}>
      <EmptyState title={t('lessons.empty.title')} message={t('lessons.empty.message')} />
    </Screen>
  );
}
