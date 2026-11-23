/** Query keys in one place so invalidation stays consistent. */
export const lessonQueryKeys = {
  all: ['lessons'] as const,
  list: () => [...lessonQueryKeys.all, 'list'] as const,
  bundle: (lessonId: string) => [...lessonQueryKeys.all, 'bundle', lessonId] as const,
  vocabulary: () => ['vocabulary'] as const,
};

export const settingsQueryKeys = {
  updatePolicy: () => ['settings', 'updatePolicy'] as const,
};
