import {
  Card,
  EmptyState,
  Icon,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { t, tPlural } from '@/core/i18n';
import { Greeting, QueryView } from '@/core/ui';
import { type LessonSummary, useLessons } from '@/data';

import { FeaturedLessonCard } from '../components/featured-lesson-card';
import { LessonUpdatesBanner } from '../components/lesson-updates-banner';
import { LessonListItem } from '../components/lesson-list-item';

/** Lessons tab: greeting, the lesson to start, and all assigned lessons. */
export function LessonsScreen() {
  const lessons = useLessons();
  return (
    <Screen>
      <Greeting />
      <LessonUpdatesBanner />
      <QueryView query={lessons} loadingMessage={t('lessons.loading')}>
        {(items) =>
          items[0] === undefined ? (
            <EmptyState title={t('lessons.empty.title')} message={t('lessons.empty.message')} />
          ) : (
            <LessonOverview featured={items[0]} lessons={items} />
          )
        }
      </QueryView>
    </Screen>
  );
}

function LessonOverview({
  featured,
  lessons,
}: {
  featured: LessonSummary;
  lessons: readonly LessonSummary[];
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <FeaturedLessonCard lesson={featured} />

      <View style={styles.sectionHeader}>
        <Text variant="title" accessibilityRole="header">
          {t('lessons.allLessons')}
        </Text>
        <Text variant="body" color="onSurfaceVariant">
          {tPlural('lessons.count', lessons.length)}
        </Text>
      </View>
      <View style={styles.list}>
        {lessons.map((lesson) => (
          <LessonListItem key={lesson.id} lesson={lesson} />
        ))}
      </View>

      <Card variant="outlined" tone="surface" radius="lg">
        <View style={styles.upcoming}>
          <View style={styles.upcomingIcon}>
            <Icon name="library" />
          </View>
          <Text variant="body" color="onSurfaceVariant" style={styles.upcomingText}>
            {t('lessons.upcoming')}
          </Text>
        </View>
      </Card>
    </>
  );
}

const UPCOMING_ICON_SIZE = 48;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
    },
    list: {
      gap: theme.spacing.md,
    },
    upcoming: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    upcomingIcon: {
      width: UPCOMING_ICON_SIZE,
      height: UPCOMING_ICON_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upcomingText: {
      flex: 1,
    },
  });
