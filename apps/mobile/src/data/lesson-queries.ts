import { useQuery } from '@tanstack/react-query';

import { lessonRepository } from './repositories';

/** Query keys in one place so invalidation stays consistent. */
export const lessonQueryKeys = {
  all: ['lessons'] as const,
  list: () => [...lessonQueryKeys.all, 'list'] as const,
  bundle: (lessonId: string) => [...lessonQueryKeys.all, 'bundle', lessonId] as const,
  vocabulary: () => ['vocabulary'] as const,
};

export function useLessons() {
  return useQuery({
    queryKey: lessonQueryKeys.list(),
    queryFn: () => lessonRepository.listLessons(),
  });
}

export function useLessonBundle(lessonId: string) {
  return useQuery({
    queryKey: lessonQueryKeys.bundle(lessonId),
    queryFn: () => lessonRepository.getLessonBundle(lessonId),
  });
}

export function useVocabulary() {
  return useQuery({
    queryKey: lessonQueryKeys.vocabulary(),
    queryFn: () => lessonRepository.listVocabulary(),
  });
}
