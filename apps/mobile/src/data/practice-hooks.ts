import {
  countPractice,
  isDue,
  planSession,
  practiceCandidates,
  type Exercise,
  type LessonBundle,
  type PracticeCounts,
  type PracticeFilter,
  type PracticeKind,
  type PracticeResult,
  type ReviewState,
} from '@ricingo/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { practiceQueryKeys } from './query-keys';
import { useDataServices } from './query-provider';

export interface TopicPractice {
  id: string;
  title: string;
  counts: PracticeCounts;
}

export interface LessonPractice {
  id: string;
  titleItalian: string;
  titleCzech: string;
  kinds: Record<PracticeKind, PracticeCounts>;
  /** Grammar topics of the lesson that have fill-in exercises. */
  topics: readonly TopicPractice[];
}

/** What there is to practise: all lessons together and lesson by lesson. */
export interface PracticeOverview {
  kinds: Record<PracticeKind, PracticeCounts>;
  lessons: readonly LessonPractice[];
}

const STABLE_ORDER = () => 0;

function topicsOf(
  bundle: LessonBundle,
  reviews: ReadonlyMap<string, ReviewState>,
  now: Date,
): TopicPractice[] {
  return bundle.grammarTopics.flatMap((topic) => {
    const candidates = practiceCandidates(
      [bundle],
      { kind: 'grammar', grammarTopicId: topic.id },
      STABLE_ORDER,
    );
    if (candidates.length === 0) return [];
    const due = candidates.filter((exercise) => isDue(reviews.get(exercise.itemKey), now));
    return [
      { id: topic.id, title: topic.title, counts: { total: candidates.length, due: due.length } },
    ];
  });
}

export function buildPracticeOverview(
  bundles: readonly LessonBundle[],
  reviews: ReadonlyMap<string, ReviewState>,
  now: Date,
): PracticeOverview {
  return {
    kinds: countPractice(bundles, reviews, now),
    lessons: bundles.map((bundle) => ({
      id: bundle.lesson.id,
      titleItalian: bundle.lesson.titleItalian,
      titleCzech: bundle.lesson.titleCzech,
      kinds: countPractice([bundle], reviews, now),
      topics: topicsOf(bundle, reviews, now),
    })),
  };
}

export function usePracticeOverview() {
  const { library, practice } = useDataServices();
  return useQuery({
    queryKey: practiceQueryKeys.overview(),
    queryFn: async () =>
      buildPracticeOverview(await library.listBundles(), await practice.readReviews(), new Date()),
  });
}

/**
 * The exercises of one session, planned once: refetching (practise again) plans a new one, and
 * saving results does not replace the session the student is in.
 */
export function usePracticeSession(filter: PracticeFilter) {
  const { library, practice } = useDataServices();
  return useQuery({
    queryKey: practiceQueryKeys.session(filter),
    queryFn: async (): Promise<readonly Exercise[]> =>
      planSession(
        practiceCandidates(await library.listBundles(), filter),
        await practice.readReviews(),
      ),
    staleTime: Infinity,
    gcTime: 0,
  });
}

/** Saves a finished session's answers; the overview shows the new counts. */
export function useRecordPractice() {
  const { practice } = useDataServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (results: readonly PracticeResult[]) => practice.record(results, new Date()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: practiceQueryKeys.overview() }),
  });
}
