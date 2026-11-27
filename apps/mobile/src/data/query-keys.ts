/** Query keys in one place so invalidation stays consistent. */
export const lessonQueryKeys = {
  all: ['lessons'] as const,
  list: () => [...lessonQueryKeys.all, 'list'] as const,
  bundle: (lessonId: string) => [...lessonQueryKeys.all, 'bundle', lessonId] as const,
  vocabulary: () => ['vocabulary'] as const,
};

export const accountQueryKeys = {
  all: ['account'] as const,
  me: () => [...accountQueryKeys.all, 'me'] as const,
};

export const settingsQueryKeys = {
  updatePolicy: () => ['settings', 'updatePolicy'] as const,
};

export const practiceQueryKeys = {
  all: ['practice'] as const,
  overview: () => [...practiceQueryKeys.all, 'overview'] as const,
  session: (filter: object) => [...practiceQueryKeys.all, 'session', filter] as const,
};
