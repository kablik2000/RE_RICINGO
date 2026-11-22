import { EmptyState, Screen } from '@ricingo/design-system';

import { t } from '@/core/i18n';

/** Shell: shows the empty state until vocabulary data is wired in (see DEVELOPMENT_PLAN). */
export function VocabularyScreen() {
  return (
    <Screen title={t('vocabulary.title')} scrollable={false}>
      <EmptyState title={t('vocabulary.empty.title')} message={t('vocabulary.empty.message')} />
    </Screen>
  );
}
