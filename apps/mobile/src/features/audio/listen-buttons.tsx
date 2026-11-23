import { Button, IconButton, type Theme, useThemedStyles } from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';

import { useItalianVoice } from './use-italian-voice';
import { usePronunciation } from './use-pronunciation';

export interface ListenButtonsProps {
  /** Italian text to pronounce. */
  text: string;
  /** A single icon button for dense lists. */
  compact?: boolean;
}

/**
 * Pronunciation controls. Hidden while the device has no Italian voice; the screen shows
 * `ItalianVoiceNotice` once instead.
 */
export function ListenButtons({ text, compact = false }: ListenButtonsProps) {
  const styles = useThemedStyles(createStyles);
  const player = usePronunciation();
  const voice = useItalianVoice();

  if (voice.status === 'missing') {
    return null;
  }

  if (compact) {
    return (
      <IconButton
        icon="volume"
        accessibilityLabel={t('audio.playWordLabel', { text })}
        onPress={() => {
          player.play(text, 'normal');
        }}
      />
    );
  }

  return (
    <View style={styles.row}>
      <IconButton
        variant="filled"
        size="large"
        icon="volume"
        accessibilityLabel={t('audio.playLabel')}
        onPress={() => {
          player.play(text, 'normal');
        }}
      />
      <Button
        variant="tonal"
        icon="slow"
        label={t('audio.playSlow')}
        accessibilityHint={t('audio.playSlowLabel')}
        onPress={() => {
          player.play(text, 'slow');
        }}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
  });
