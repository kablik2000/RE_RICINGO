import {
  Button,
  Card,
  FilterChip,
  Icon,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { listSentencesInOrder, type LessonBundle } from '@ricingo/domain';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useLessonBundle } from '@/data';
import {
  ItalianVoiceNotice,
  ListenButtons,
  useItalianVoice,
  usePronunciation,
} from '@/features/audio';

/** The whole conversation in context (spec §4), with optional translation. */
export function FullDialogueScreen({ lessonId }: { lessonId: string }) {
  const lesson = useLessonBundle(lessonId);
  return (
    <Screen safeAreaTop={false}>
      <QueryView query={lesson} loadingMessage={t('lessonIntro.loading')}>
        {(bundle) => <Dialogue bundle={bundle} />}
      </QueryView>
    </Screen>
  );
}

function Dialogue({ bundle }: { bundle: LessonBundle }) {
  const styles = useThemedStyles(createStyles);
  const player = usePronunciation();
  const voice = useItalianVoice();
  const [showTranslation, setShowTranslation] = useState(true);
  const { lesson } = bundle;
  const speakers = new Map(lesson.speakers.map((speaker) => [speaker.id, speaker.label]));
  const firstSpeakerId = lesson.speakers[0]?.id;

  return (
    <>
      <ItalianVoiceNotice />
      <View style={styles.toolbar}>
        {voice.status !== 'missing' && (
          <Button
            variant="tonal"
            icon="headphones"
            label={t('dialogue.playAll')}
            onPress={() => {
              player.playSequence(
                listSentencesInOrder(lesson).map((item) => item.sentence.italian),
              );
            }}
          />
        )}
        <FilterChip
          label={t('dialogue.translation')}
          selected={showTranslation}
          onPress={() => {
            setShowTranslation((value) => !value);
          }}
        />
      </View>

      {lesson.turns.map((turn) => {
        const isFirstSpeaker = turn.speakerId === firstSpeakerId;
        return (
          <Card
            key={turn.id}
            variant={isFirstSpeaker ? 'filled' : 'outlined'}
            tone={isFirstSpeaker ? 'surfaceContainerLow' : 'surface'}>
            <View style={styles.speaker}>
              <View style={styles.avatar}>
                <Icon name="person" size={18} />
              </View>
              <Text variant="label" color="onSurfaceVariant">
                {speakers.get(turn.speakerId) ?? turn.speakerId}
              </Text>
            </View>
            {turn.sentences.map((sentence) => (
              <View key={sentence.id} style={styles.sentence}>
                <View style={styles.sentenceText}>
                  <Text variant="italianText" accessibilityLanguage="it-IT">
                    {sentence.italian}
                  </Text>
                  {showTranslation && (
                    <Text variant="translation" color="onSurfaceVariant">
                      {sentence.czech}
                    </Text>
                  )}
                </View>
                <ListenButtons text={sentence.italian} compact />
              </View>
            ))}
          </Card>
        );
      })}
    </>
  );
}

const AVATAR_SIZE = 32;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
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
    sentence: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    sentenceText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
  });
