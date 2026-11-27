import {
  Card,
  Icon,
  type IconName,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t, tPlural } from '@/core/i18n';
import { type Recommendation, useRecommendations } from '@/data';

const ICONS: Readonly<Record<Recommendation['kind'], IconName>> = {
  lesson: 'book',
  practice: 'grammar',
  vocabulary: 'translate',
};

function actionLabel(recommendation: Recommendation): string {
  switch (recommendation.kind) {
    case 'lesson':
      return t('home.teacher.lesson');
    case 'practice':
      return recommendation.grammarTopic === null
        ? t('home.teacher.practiceLesson')
        : t('home.teacher.practiceTopic', { topic: recommendation.grammarTopic.title });
    case 'vocabulary':
      return tPlural('home.teacher.vocabulary', recommendation.words.length);
  }
}

/**
 * "Od vaší lektorky" (ADR-0013 step 5): what the signed-in student's lecturer recommends. Shows
 * nothing for anonymous students or when there is nothing; the last list received works offline.
 */
export function TeacherRecommendations() {
  const styles = useThemedStyles(createStyles);
  const recommendations = useRecommendations();
  if (recommendations.isError) {
    return (
      <Text variant="bodySmall" color="onSurfaceVariant">
        {t('home.teacher.failed')}
      </Text>
    );
  }
  const items = recommendations.data ?? [];
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text variant="title" accessibilityRole="header">
        {t('home.teacher.title')}
      </Text>
      {items.map((item) => (
        <RecommendationCard key={item.id} recommendation={item} />
      ))}
    </View>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { lesson } = recommendation;
  const action = actionLabel(recommendation);
  const open = () => {
    if (recommendation.kind === 'lesson') {
      router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } });
      return;
    }
    if (recommendation.kind === 'vocabulary') {
      router.push({
        pathname: '/practice/session',
        params: {
          kind: 'vocabulary',
          lessonId: lesson.id,
          words: recommendation.words.map((word) => word.id).join(','),
        },
      });
      return;
    }
    const topic = recommendation.grammarTopic;
    router.push({
      pathname: '/practice/session',
      params:
        topic === null
          ? { kind: 'mixed', lessonId: lesson.id }
          : { kind: 'grammar', lessonId: lesson.id, topicId: topic.id },
    });
  };

  return (
    <Card
      tone="primaryContainer"
      radius="lg"
      padding="lg"
      onPress={open}
      accessibilityLabel={[action, lesson.titleItalian, recommendation.note]
        .filter(Boolean)
        .join(', ')}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name={ICONS[recommendation.kind]} color="onPrimary" />
        </View>
        <View style={styles.text}>
          <Text variant="titleSmall" color="onPrimaryContainer">
            {action}
          </Text>
          <Text variant="body" color="onPrimaryContainer" accessibilityLanguage="it-IT">
            {`${lesson.titleItalian} · ${lesson.level}`}
          </Text>
          {recommendation.kind === 'vocabulary' && (
            <Text variant="bodySmall" color="onPrimaryContainer" accessibilityLanguage="it-IT">
              {recommendation.words.map((word) => word.lemma).join(', ')}
            </Text>
          )}
          {recommendation.note !== null && (
            <Text variant="body" color="onPrimaryContainer" style={styles.note}>
              {`„${recommendation.note}“`}
            </Text>
          )}
          <Text variant="labelSmall" color="onPrimaryContainer">
            {t('home.teacher.from', { name: recommendation.teacherName })}
          </Text>
        </View>
        <Icon name="chevronRight" color="onPrimaryContainer" />
      </View>
    </Card>
  );
}

const ICON_SIZE = 40;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    icon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    note: {
      fontStyle: 'italic',
    },
  });
