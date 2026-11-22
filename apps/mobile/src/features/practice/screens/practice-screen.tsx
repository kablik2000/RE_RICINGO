import { EmptyState, Screen } from '@ricingo/design-system';

import { t } from '@/core/i18n';

/** Shell: shows the empty state until practice data is wired in (see DEVELOPMENT_PLAN). */
export function PracticeScreen() {
  return (
    <Screen title={t('practice.title')} scrollable={false}>
      <EmptyState title={t('practice.empty.title')} message={t('practice.empty.message')} />
    </Screen>
  );
}
