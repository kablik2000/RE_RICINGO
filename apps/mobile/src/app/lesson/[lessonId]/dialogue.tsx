import { useLocalSearchParams } from 'expo-router';

import { NotFoundScreen } from '@/core/ui';
import { FullDialogueScreen } from '@/features/dialogue';
import { singleParam } from '@/navigation/route-params';

export default function FullDialogueRoute() {
  const lessonId = singleParam(useLocalSearchParams<{ lessonId?: string | string[] }>().lessonId);
  if (lessonId === undefined) {
    return <NotFoundScreen />;
  }
  return <FullDialogueScreen key={lessonId} lessonId={lessonId} />;
}
