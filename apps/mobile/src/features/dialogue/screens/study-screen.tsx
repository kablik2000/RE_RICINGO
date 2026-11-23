import {
  Button,
  Card,
  ProgressBar,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { listSentencesInOrder, type LessonBundle } from '@ricingo/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useLessonBundle } from '@/data';
import { ItalianVoiceNotice, ListenButtons } from '@/features/audio';
import { SentenceAnalysis } from '@/features/sentence-analysis';

/** Sentence-by-sentence walkthrough of a lesson dialogue (spec §3 "Průchod tematickým celkem"). */
export function StudyScreen({ lessonId }: { lessonId: string }) {
  const lesson = useLessonBundle(lessonId);
  return (
    <QueryView query={lesson} loadingMessage={t('lessonIntro.loading')}>
      {(bundle) => <StudyWalkthrough bundle={bundle} />}
    </QueryView>
  );
}

function StudyWalkthrough({ bundle }: { bundle: LessonBundle }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const sentences = listSentencesInOrder(bundle.lesson);
  const [index, setIndex] = useState(0);
  const current = sentences[index];
  if (current === undefined) {
    return null;
  }

  const total = sentences.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const progressLabel = t('study.progress', { current: index + 1, total });

  return (
    // Keyed by sentence so scroll position and expanded explanations reset on each step.
    <Screen key={current.sentence.id} safeAreaTop={false}>
      <View style={styles.progress}>
        <Text variant="labelSmall" color="onSurfaceVariant">
          {progressLabel}
        </Text>
        <ProgressBar value={(index + 1) / total} accessibilityLabel={progressLabel} />
      </View>

      <Card tone="surface">
        <Text variant="labelSmall" color="primary">
          {current.speaker.label}
        </Text>
        <Text variant="italianSentence" accessibilityLanguage="it-IT">
          {current.sentence.italian}
        </Text>
        <Text variant="translation" color="onSurfaceVariant">
          {current.sentence.czech}
        </Text>
        <ListenButtons text={current.sentence.italian} />
      </Card>
      <ItalianVoiceNotice />

      <Text variant="title" accessibilityRole="header">
        {t('study.analysis')}
      </Text>
      <SentenceAnalysis sentence={current.sentence} bundle={bundle} />

      <View style={styles.navigation}>
        <Button
          variant="outlined"
          label={t('study.previous')}
          disabled={isFirst}
          onPress={() => {
            setIndex(index - 1);
          }}
        />
        <Button
          label={isLast ? t('study.finish') : t('study.next')}
          onPress={() => {
            if (isLast) {
              router.replace({
                pathname: '/lesson/[lessonId]/dialogue',
                params: { lessonId: bundle.lesson.id },
              });
            } else {
              setIndex(index + 1);
            }
          }}
        />
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    progress: {
      gap: theme.spacing.xs,
    },
    navigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
  });
