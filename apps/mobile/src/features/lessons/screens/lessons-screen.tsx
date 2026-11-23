import { EmptyState, Screen } from '@ricingo/design-system';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useLessons } from '@/data';

import { LessonCard } from '../components/lesson-card';

export function LessonsScreen() {
  const lessons = useLessons();
  return (
    <Screen title={t('lessons.title')}>
      <QueryView query={lessons} loadingMessage={t('lessons.loading')}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState title={t('lessons.empty.title')} message={t('lessons.empty.message')} />
          ) : (
            items.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)
          )
        }
      </QueryView>
    </Screen>
  );
}
