import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { lessonQueryKeys } from './query-keys';
import { useDataServices } from './query-provider';

export function useLessons() {
  const { library } = useDataServices();
  return useQuery({
    queryKey: lessonQueryKeys.list(),
    queryFn: () => library.listLessons(),
  });
}

/**
 * One lesson's content. While a screen uses it, the lesson counts as open: an update that
 * arrives meanwhile is installed only after the student leaves the lesson.
 */
export function useLessonBundle(lessonId: string) {
  const { library, holds } = useDataServices();
  // Registers the open lesson with the update engine (an external system) for the screen's life.
  useEffect(() => holds.hold(lessonId), [holds, lessonId]);
  return useQuery({
    queryKey: lessonQueryKeys.bundle(lessonId),
    queryFn: () => library.getLessonBundle(lessonId),
  });
}

export function useVocabulary() {
  const { library } = useDataServices();
  return useQuery({
    queryKey: lessonQueryKeys.vocabulary(),
    queryFn: () => library.listVocabulary(),
  });
}
