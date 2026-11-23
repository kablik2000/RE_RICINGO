import { useLocalSearchParams } from 'expo-router';

import { NotFoundScreen } from '@/core/ui';
import { LessonIntroScreen } from '@/features/lessons';
import { singleParam } from '@/navigation/route-params';

export default function LessonIntroRoute() {
  const lessonId = singleParam(useLocalSearchParams<{ lessonId?: string | string[] }>().lessonId);
  if (lessonId === undefined) {
    return <NotFoundScreen />;
  }
  return <LessonIntroScreen key={lessonId} lessonId={lessonId} />;
}
