import { useLocalSearchParams } from 'expo-router';

import { NotFoundScreen } from '@/core/ui';
import { isPracticeKind, PracticeSessionScreen } from '@/features/practice';
import { singleParam } from '@/navigation/route-params';

type Params = Record<'kind' | 'lessonId' | 'topicId', string | string[] | undefined>;

export default function PracticeSessionRoute() {
  const params = useLocalSearchParams<Params>();
  const kind = singleParam(params.kind);
  const lessonId = singleParam(params.lessonId);
  const grammarTopicId = singleParam(params.topicId);
  if (!isPracticeKind(kind)) {
    return <NotFoundScreen />;
  }
  const filter = {
    kind,
    ...(lessonId !== undefined && { lessonId }),
    ...(grammarTopicId !== undefined && { grammarTopicId }),
  };
  return <PracticeSessionScreen key={JSON.stringify(filter)} filter={filter} />;
}
