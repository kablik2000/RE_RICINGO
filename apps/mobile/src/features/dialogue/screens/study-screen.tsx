import {
  Button,
  Card,
  Icon,
  IconButton,
  ProgressBar,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { listSentencesInOrder, type LessonBundle, type SentenceInContext } from '@ricingo/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useLessonBundle } from '@/data';
import { ItalianVoiceNotice, ListenButtons } from '@/features/audio';
import { InteractiveSentence, SegmentDetail } from '@/features/sentence-analysis';

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
  const router = useRouter();
  const sentences = listSentencesInOrder(bundle.lesson);
  const [index, setIndex] = useState(0);
  const current = sentences[index];
  if (current === undefined) {
    return null;
  }

  const isLast = index === sentences.length - 1;
  return (
    // Keyed by sentence so the scroll position and the selected word reset on each step.
    <SentenceStep
      key={current.sentence.id}
      bundle={bundle}
      current={current}
      total={sentences.length}
      onPrevious={
        index === 0
          ? undefined
          : () => {
              setIndex(index - 1);
            }
      }
      onNext={() => {
        if (isLast) {
          router.replace({
            pathname: '/lesson/[lessonId]/dialogue',
            params: { lessonId: bundle.lesson.id },
          });
        } else {
          setIndex(index + 1);
        }
      }}
      isLast={isLast}
    />
  );
}

interface SentenceStepProps {
  bundle: LessonBundle;
  current: SentenceInContext;
  total: number;
  onPrevious: (() => void) | undefined;
  onNext: () => void;
  isLast: boolean;
}

function SentenceStep({ bundle, current, total, onPrevious, onNext, isLast }: SentenceStepProps) {
  const styles = useThemedStyles(createStyles);
  const { sentence, speaker } = current;
  const [selectedId, setSelectedId] = useState(sentence.segments[0]?.id);
  const selected = sentence.segments.find((segment) => segment.id === selectedId);

  return (
    <Screen
      topBar={
        <StudyTopBar
          title={bundle.lesson.titleItalian}
          position={current.index + 1}
          total={total}
        />
      }
      footer={
        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <Button
              fullWidth
              size="large"
              variant="outlined"
              icon="back"
              label={t('study.previous')}
              disabled={onPrevious === undefined}
              onPress={() => {
                onPrevious?.();
              }}
            />
          </View>
          <View style={styles.footerButtonWide}>
            <Button
              fullWidth
              size="large"
              trailingIcon="forward"
              label={isLast ? t('study.finish') : t('study.next')}
              onPress={onNext}
            />
          </View>
        </View>
      }>
      <Card variant="outlined" padding="xl">
        <View style={styles.speaker}>
          <View style={styles.avatar}>
            <Icon name="person" size={18} />
          </View>
          <Text variant="label" color="onSurfaceVariant" style={styles.speakerName}>
            {speaker.label}
          </Text>
          {sentence.segments.length > 0 && (
            <Text variant="bodySmall" color="onSurfaceVariant">
              {t('study.tapWord')}
            </Text>
          )}
        </View>
        <InteractiveSentence
          sentence={sentence}
          selectedSegmentId={selectedId}
          onSelectSegment={setSelectedId}
        />
        <Text variant="translation" color="onSurfaceVariant">
          {sentence.czech}
        </Text>
        <View style={styles.listen}>
          <ListenButtons text={sentence.italian} />
        </View>
      </Card>

      {selected !== undefined && <SegmentDetail segment={selected} bundle={bundle} />}
      <ItalianVoiceNotice />
    </Screen>
  );
}

function StudyTopBar({
  title,
  position,
  total,
}: {
  title: string;
  position: number;
  total: number;
}) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const progressLabel = t('study.progress', { current: position, total });
  return (
    <View style={styles.topBar}>
      <IconButton
        icon="close"
        accessibilityLabel={t('study.close')}
        onPress={() => {
          router.back();
        }}
      />
      <View style={styles.progress}>
        <View style={styles.progressLabels}>
          <Text variant="labelSmall" color="onSurfaceVariant" accessibilityLanguage="it-IT">
            {title}
          </Text>
          <Text variant="labelSmall" color="onSurfaceVariant">
            {progressLabel}
          </Text>
        </View>
        <ProgressBar value={position / total} accessibilityLabel={progressLabel} />
      </View>
    </View>
  );
}

const AVATAR_SIZE = 32;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingRight: theme.spacing.lg,
      paddingBottom: theme.spacing.xs,
    },
    progress: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    speaker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listen: {
      marginTop: theme.spacing.xs,
    },
    speakerName: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    footerButton: {
      flex: 2,
    },
    footerButtonWide: {
      flex: 3,
    },
  });
