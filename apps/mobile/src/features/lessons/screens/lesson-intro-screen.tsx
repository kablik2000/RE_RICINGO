import {
  Button,
  Card,
  Chip,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { countExchanges, listSentencesInOrder, type LessonBundle } from '@ricingo/domain';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useLessonBundle } from '@/data';

export function LessonIntroScreen({ lessonId }: { lessonId: string }) {
  const lesson = useLessonBundle(lessonId);
  return (
    <Screen safeAreaTop={false}>
      <QueryView query={lesson} loadingMessage={t('lessonIntro.loading')}>
        {(bundle) => <LessonIntro bundle={bundle} />}
      </QueryView>
    </Screen>
  );
}

function LessonIntro({ bundle }: { bundle: LessonBundle }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { lesson } = bundle;
  const params = { lessonId: lesson.id };

  return (
    <>
      <Stack.Screen options={{ title: lesson.titleItalian }} />
      <View style={styles.heading}>
        <Chip label={lesson.level} />
        <Text variant="display" style={styles.italianTitle} accessibilityRole="header">
          {lesson.titleItalian}
        </Text>
        <Text variant="translation" color="onSurfaceVariant">
          {lesson.titleCzech}
        </Text>
      </View>

      <Card>
        <Text variant="label" color="primary">
          {t('lessonIntro.goal')}
        </Text>
        <Text variant="bodyLarge">{lesson.goal}</Text>
        <View style={styles.stats}>
          <Stat label={t('lessonIntro.exchanges')} value={countExchanges(lesson)} />
          <Stat label={t('lessonIntro.sentences')} value={listSentencesInOrder(lesson).length} />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          fullWidth
          label={t('lessonIntro.start')}
          onPress={() => {
            router.push({ pathname: '/lesson/[lessonId]/study', params });
          }}
        />
        <Button
          fullWidth
          variant="outlined"
          label={t('lessonIntro.fullDialogue')}
          onPress={() => {
            router.push({ pathname: '/lesson/[lessonId]/dialogue', params });
          }}
        />
      </View>

      <Text variant="title" accessibilityRole="header">
        {t('lessonIntro.grammar')}
      </Text>
      {bundle.grammarTopics.map((topic) => (
        <Card key={topic.id}>
          <Text variant="label">{topic.title}</Text>
          <Text variant="body" color="onSurfaceVariant">
            {topic.summary}
          </Text>
        </Card>
      ))}

      <Text variant="bodySmall" color="onSurfaceVariant">
        {`${t('lessonIntro.demoNote')} ${t('audio.sourceNote')}`}
      </Text>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="headline">{String(value)}</Text>
      <Text variant="bodySmall" color="onSurfaceVariant">
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heading: {
      gap: theme.spacing.xs,
    },
    italianTitle: {
      fontFamily: theme.typography.italianSentence.fontFamily,
    },
    stats: {
      flexDirection: 'row',
      gap: theme.spacing.xxl,
      paddingTop: theme.spacing.sm,
    },
    stat: {
      gap: theme.spacing.xxs,
    },
    actions: {
      gap: theme.spacing.sm,
    },
  });
