import { useLocalSearchParams } from 'expo-router';

import { NotFoundScreen } from '@/core/ui';
import { isPracticeSelection, PracticeSessionScreen } from '@/features/practice';
import { singleParam } from '@/navigation/route-params';

type Params = Record<'kind' | 'lessonId' | 'topicId' | 'words', string | string[] | undefined>;

/** Lesson, topic and word IDs are lowercase kebab-case (lesson bundle schema). */
const CONTENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `?kind=grammar&lessonId=al-bar&topicId=…` or `?kind=vocabulary&lessonId=al-bar&words=a,b`. */
export default function PracticeSessionRoute() {
  const params = useLocalSearchParams<Params>();
  const kind = singleParam(params.kind);
  const lessonId = singleParam(params.lessonId);
  const grammarTopicId = singleParam(params.topicId);
  const words = singleParam(params.words)?.split(',');
  if (!isPracticeSelection(kind) || words?.some((word) => !CONTENT_ID.test(word))) {
    return <NotFoundScreen />;
  }
  const filter = {
    kind,
    ...(lessonId !== undefined && { lessonId }),
    ...(grammarTopicId !== undefined && { grammarTopicId }),
    ...(words !== undefined && { lexemeIds: words }),
  };
  return <PracticeSessionScreen key={JSON.stringify(filter)} filter={filter} />;
}
