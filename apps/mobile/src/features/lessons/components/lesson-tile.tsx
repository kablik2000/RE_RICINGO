import { Card, Chip, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import type { LessonSummary } from '@/data';

import { LessonArtwork } from '../artwork/lesson-artwork';

/** A small card for horizontal rows of lessons: artwork, level and both titles. */
export function LessonTile({ lesson }: { lesson: LessonSummary }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  return (
    <View style={styles.tile}>
      <Card
        variant="outlined"
        radius="lg"
        padding="none"
        onPress={() => {
          router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } });
        }}
        accessibilityLabel={t('home.start.label', {
          title: lesson.titleItalian,
          czech: lesson.titleCzech,
          level: lesson.level,
        })}
        accessibilityHint={t('lessons.openHint')}>
        <View>
          <LessonArtwork lessonId={lesson.id} variant="thumbnail" style={styles.art} />
          <View style={styles.level}>
            <Chip variant="tag" label={lesson.level} />
          </View>
        </View>
        <View style={styles.text}>
          <Text variant="italianTitleSmall" accessibilityLanguage="it-IT" numberOfLines={1}>
            {lesson.titleItalian}
          </Text>
          <Text variant="bodySmall" color="onSurfaceVariant" numberOfLines={1}>
            {lesson.titleCzech}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const TILE_WIDTH = 156;
const ART_HEIGHT = 96;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tile: {
      width: TILE_WIDTH,
    },
    art: {
      height: ART_HEIGHT,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
    },
    level: {
      position: 'absolute',
      top: theme.spacing.sm,
      left: theme.spacing.sm,
    },
    text: {
      alignItems: 'center',
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
    },
  });
