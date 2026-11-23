import { Button, Card, Screen, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { listSentencesInOrder, type LessonBundle } from '@ricingo/domain';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { useLessonBundle } from '@/data';
import { ListenButtons, usePronunciation } from '@/features/audio';

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
  const [showTranslation, setShowTranslation] = useState(true);
  const { lesson } = bundle;
  const speakers = new Map(lesson.speakers.map((speaker) => [speaker.id, speaker.label]));
  const firstSpeakerId = lesson.speakers[0]?.id;

  return (
    <>
      <View style={styles.toolbar}>
        <Button
          variant="tonal"
          label={`▶ ${t('dialogue.playAll')}`}
          onPress={() => {
            player.playSequence(listSentencesInOrder(lesson).map((item) => item.sentence.italian));
          }}
        />
        <Button
          variant="text"
          label={showTranslation ? t('dialogue.hideTranslation') : t('dialogue.showTranslation')}
          onPress={() => {
            setShowTranslation((value) => !value);
          }}
        />
      </View>

      {lesson.turns.map((turn) => (
        <Card
          key={turn.id}
          tone={turn.speakerId === firstSpeakerId ? 'surfaceContainerLow' : 'surfaceContainerHigh'}>
          <Text variant="labelSmall" color="primary">
            {speakers.get(turn.speakerId) ?? turn.speakerId}
          </Text>
          {turn.sentences.map((sentence) => (
            <View key={sentence.id} style={styles.sentence}>
              <Text variant="italianText" accessibilityLanguage="it-IT">
                {sentence.italian}
              </Text>
              {showTranslation && (
                <Text variant="translation" color="onSurfaceVariant">
                  {sentence.czech}
                </Text>
              )}
              <ListenButtons text={sentence.italian} compact />
            </View>
          ))}
        </Card>
      ))}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    sentence: {
      gap: theme.spacing.xxs,
    },
  });
