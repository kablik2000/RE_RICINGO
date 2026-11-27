import { Screen, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { t, tPlural } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { type LessonSummary, useLessons } from '@/data';

import { LessonListItem } from '../components/lesson-list-item';
import { levelsOf, themeLabel, themesOf } from '../lesson-themes';

export type BrowseBy = 'theme' | 'level';

interface Section {
  key: string;
  title: string;
  lessons: readonly LessonSummary[];
}

function sections(lessons: readonly LessonSummary[], by: BrowseBy): Section[] {
  if (by === 'level') {
    return levelsOf(lessons).map((level) => ({
      key: level,
      title: t('lessons.browse.level', { level }),
      lessons: lessons.filter((lesson) => lesson.level === level),
    }));
  }
  const withoutTheme = lessons.filter((lesson) => lesson.theme === null);
  return [
    ...themesOf(lessons).map((theme) => ({
      key: theme,
      title: themeLabel(theme),
      lessons: lessons.filter((lesson) => lesson.theme === theme),
    })),
    ...(withoutTheme.length > 0
      ? [{ key: 'none', title: themeLabel(null), lessons: withoutTheme }]
      : []),
  ];
}

/** All lessons grouped by theme ("Tematické okruhy") or by level ("Úrovně"). */
export function BrowseLessonsScreen({ by }: { by: BrowseBy }) {
  const styles = useThemedStyles(createStyles);
  const lessons = useLessons();
  return (
    <Screen>
      <QueryView query={lessons} loadingMessage={t('lessons.loading')}>
        {(items) =>
          sections(items, by).map((section) => (
            <View key={section.key} style={styles.section}>
              <View style={styles.header}>
                <Text variant="title" accessibilityRole="header">
                  {section.title}
                </Text>
                <Text variant="body" color="onSurfaceVariant">
                  {tPlural('lessons.count', section.lessons.length)}
                </Text>
              </View>
              {section.lessons.map((lesson) => (
                <LessonListItem key={lesson.id} lesson={lesson} />
              ))}
            </View>
          ))
        }
      </QueryView>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
  });
