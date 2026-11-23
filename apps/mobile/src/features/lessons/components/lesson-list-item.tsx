import { Card, Icon, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t, tPlural } from '@/core/i18n';
import type { LessonSummary } from '@/data';

import { LessonArtwork } from '../artwork/lesson-artwork';

/** A lesson in the list: thumbnail artwork, Italian title, Czech topic, size and level. */
export function LessonListItem({ lesson }: { lesson: LessonSummary }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const meta = `${lesson.titleCzech} · ${tPlural('lessons.sentenceCount', lesson.sentenceCount)}`;
  return (
    <Card
      variant="outlined"
      radius="lg"
      padding="md"
      onPress={() => {
        router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } });
      }}
      accessibilityLabel={`${lesson.titleItalian}, ${meta}, ${lesson.level}`}
      accessibilityHint={t('lessons.openHint')}>
      <View style={styles.row}>
        <LessonArtwork lessonId={lesson.id} variant="thumbnail" style={styles.thumbnail} />
        <View style={styles.text}>
          <Text variant="italianTitleSmall" accessibilityLanguage="it-IT">
            {lesson.titleItalian}
          </Text>
          <Text variant="body" color="onSurfaceVariant">
            {meta}
          </Text>
          <Text variant="labelSmall" color="onSurfaceVariant">
            {lesson.level}
          </Text>
        </View>
        <Icon name="chevronRight" />
      </View>
    </Card>
  );
}

const THUMBNAIL_SIZE = 72;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    thumbnail: {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      borderRadius: theme.radius.lg,
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
  });
