import { Button, Card, Chip, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t, tPlural } from '@/core/i18n';
import type { LessonSummary } from '@/data';

import { LessonArtwork } from '../artwork/lesson-artwork';

/**
 * Prominent card offering a lesson to start, with its artwork. Progress is not tracked yet (M7),
 * so it offers the first lesson rather than "continue where you left off".
 */
export function FeaturedLessonCard({ lesson }: { lesson: LessonSummary }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  return (
    <Card tone="primaryContainer" padding="none" testID="featured-lesson">
      <View>
        <LessonArtwork lessonId={lesson.id} variant="banner" style={styles.banner} />
        <View style={styles.levelBadge}>
          <Chip variant="tag" label={lesson.level} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.text}>
          <Text variant="overline" color="onPrimaryContainer">
            {t('lessons.featured')}
          </Text>
          <Text variant="italianTitle" color="onPrimaryContainer" accessibilityLanguage="it-IT">
            {lesson.titleItalian}
          </Text>
          <Text variant="body" color="onPrimaryContainer">
            {`${lesson.titleCzech} · ${tPlural('lessons.sentenceCount', lesson.sentenceCount)}`}
          </Text>
        </View>
        <Button
          icon="play"
          label={t('lessons.startLesson')}
          onPress={() => {
            router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } });
          }}
        />
      </View>
    </Card>
  );
}

const BANNER_HEIGHT = 164;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: {
      height: BANNER_HEIGHT,
    },
    levelBadge: {
      position: 'absolute',
      top: theme.spacing.md,
      left: theme.spacing.lg,
    },
    body: {
      padding: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.lg,
      alignItems: 'flex-start',
    },
    text: {
      gap: theme.spacing.xxs,
    },
  });
