import {
  EmptyState,
  FilterChip,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { PRACTICE_KINDS, type PracticeFilter } from '@ricingo/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t, tPlural } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { usePracticeOverview, type LessonPractice, type PracticeOverview } from '@/data';

import { PracticeRow } from '../components/practice-row';
import { dueLabel, KIND_ICONS } from '../practice-kinds';

type PracticeView = 'recommended' | 'byLesson';

/** Practice home (spec §9, ADR-0017): what is due across all lessons, or lesson by lesson. */
export function PracticeScreen() {
  const overview = usePracticeOverview();
  return (
    <Screen title={t('practice.title')}>
      <QueryView query={overview} loadingMessage={t('practice.loading')}>
        {(data) =>
          data.lessons.length === 0 ? (
            <EmptyState title={t('practice.empty.title')} message={t('practice.empty.message')} />
          ) : (
            <Overview overview={data} />
          )
        }
      </QueryView>
    </Screen>
  );
}

function useStartPractice() {
  const router = useRouter();
  return (filter: PracticeFilter) => {
    router.push({
      pathname: '/practice/session',
      params: {
        kind: filter.kind,
        ...(filter.lessonId !== undefined && { lessonId: filter.lessonId }),
        ...(filter.grammarTopicId !== undefined && { topicId: filter.grammarTopicId }),
      },
    });
  };
}

function Overview({ overview }: { overview: PracticeOverview }) {
  const styles = useThemedStyles(createStyles);
  const [view, setView] = useState<PracticeView>('recommended');
  const start = useStartPractice();

  return (
    <>
      <View
        style={styles.views}
        accessibilityRole="tablist"
        accessibilityLabel={t('practice.views.label')}>
        {(['recommended', 'byLesson'] as const).map((item) => (
          <FilterChip
            key={item}
            label={t(`practice.views.${item}`)}
            selected={view === item}
            onPress={() => {
              setView(item);
            }}
          />
        ))}
      </View>

      {view === 'recommended' ? (
        <View style={styles.list}>
          {PRACTICE_KINDS.filter((kind) => overview.kinds[kind].total > 0).map((kind) => (
            <PracticeRow
              key={kind}
              icon={KIND_ICONS[kind]}
              title={t(`practice.kinds.${kind}`)}
              description={t(`practice.kindDescriptions.${kind}`)}
              status={dueLabel(kind, overview.kinds[kind])}
              onPress={() => {
                start({ kind });
              }}
            />
          ))}
        </View>
      ) : (
        overview.lessons.map((lesson) => (
          <LessonSection
            key={lesson.id}
            lesson={lesson}
            onStart={(filter) => {
              start({ ...filter, lessonId: lesson.id });
            }}
          />
        ))
      )}
    </>
  );
}

function LessonSection({
  lesson,
  onStart,
}: {
  lesson: LessonPractice;
  onStart: (filter: Omit<PracticeFilter, 'lessonId'>) => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <View>
        <Text variant="italianTitle" accessibilityRole="header" accessibilityLanguage="it-IT">
          {lesson.titleItalian}
        </Text>
        <Text variant="body" color="onSurfaceVariant">
          {lesson.titleCzech}
        </Text>
      </View>
      <View style={styles.list}>
        {PRACTICE_KINDS.filter((kind) => lesson.kinds[kind].total > 0).map((kind) => (
          <PracticeRow
            key={kind}
            icon={KIND_ICONS[kind]}
            title={t(`practice.kinds.${kind}`)}
            status={dueLabel(kind, lesson.kinds[kind])}
            onPress={() => {
              onStart({ kind });
            }}
          />
        ))}
      </View>
      {lesson.topics.length > 0 && (
        <View style={styles.list}>
          <Text variant="label" color="onSurfaceVariant" accessibilityRole="header">
            {t('practice.topicsTitle')}
          </Text>
          {lesson.topics.map((topic) => (
            <PracticeRow
              key={topic.id}
              icon="grammar"
              title={topic.title}
              status={
                topic.counts.due === 0
                  ? t('practice.allDone')
                  : tPlural('practice.due.exercises', topic.counts.due)
              }
              onPress={() => {
                onStart({ kind: 'grammar', grammarTopicId: topic.id });
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    views: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    list: {
      gap: theme.spacing.sm,
    },
    section: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
  });
