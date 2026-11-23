import { useLocalSearchParams } from 'expo-router';

import { NotFoundScreen } from '@/core/ui';
import { StudyScreen } from '@/features/dialogue';
import { singleParam } from '@/navigation/route-params';

export default function StudyRoute() {
  const lessonId = singleParam(useLocalSearchParams<{ lessonId?: string | string[] }>().lessonId);
  if (lessonId === undefined) {
    return <NotFoundScreen />;
  }
  return <StudyScreen key={lessonId} lessonId={lessonId} />;
}
