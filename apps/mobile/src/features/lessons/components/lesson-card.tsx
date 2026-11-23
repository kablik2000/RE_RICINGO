import { Card, Chip, Text } from '@ricingo/design-system';
import { useRouter } from 'expo-router';

import { t } from '@/core/i18n';
import type { LessonSummary } from '@/data';

export function LessonCard({ lesson }: { lesson: LessonSummary }) {
  const router = useRouter();
  return (
    <Card
      onPress={() => {
        router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } });
      }}
      accessibilityLabel={`${lesson.titleItalian}, ${lesson.titleCzech}, ${lesson.level}`}
      accessibilityHint={t('lessons.openHint')}>
      <Chip label={lesson.level} />
      <Text variant="italianSentence">{lesson.titleItalian}</Text>
      <Text variant="translation" color="onSurfaceVariant">
        {lesson.titleCzech}
      </Text>
      <Text variant="body">{lesson.goal}</Text>
    </Card>
  );
}
