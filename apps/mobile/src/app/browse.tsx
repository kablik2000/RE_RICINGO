import { Stack, useLocalSearchParams } from 'expo-router';

import { t } from '@/core/i18n';
import { NotFoundScreen } from '@/core/ui';
import { BrowseLessonsScreen } from '@/features/lessons';
import { singleParam } from '@/navigation/route-params';

/** `/browse?by=theme` or `/browse?by=level`. */
export default function BrowseRoute() {
  const by = singleParam(useLocalSearchParams<{ by?: string | string[] }>().by);
  if (by !== 'theme' && by !== 'level') {
    return <NotFoundScreen />;
  }
  return (
    <>
      <Stack.Screen
        options={{
          title: by === 'theme' ? t('lessons.browse.themesTitle') : t('lessons.browse.levelsTitle'),
        }}
      />
      <BrowseLessonsScreen by={by} />
    </>
  );
}
