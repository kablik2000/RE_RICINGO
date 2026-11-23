import { EmptyState, Screen } from '@ricingo/design-system';

import { t } from '@/core/i18n';
import { Greeting } from '@/core/ui';
import { LessonUpdatesBanner } from '@/features/lessons';

/**
 * Home tab. Its content is still to be designed with the owner (DEVELOPMENT_PLAN, Design v1);
 * until then it says so honestly instead of duplicating the Lessons tab.
 */
export function HomeScreen() {
  return (
    <Screen>
      <Greeting />
      <LessonUpdatesBanner />
      <EmptyState title={t('home.pending.title')} message={t('home.pending.message')} />
    </Screen>
  );
}
