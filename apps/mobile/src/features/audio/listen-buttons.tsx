import { Button, type Theme, useThemedStyles } from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';

import { usePronunciation } from './use-pronunciation';

export interface ListenButtonsProps {
  /** Italian text to pronounce. */
  text: string;
  /** Single small "play" control for dense lists. */
  compact?: boolean;
}

export function ListenButtons({ text, compact = false }: ListenButtonsProps) {
  const styles = useThemedStyles(createStyles);
  const player = usePronunciation();

  if (compact) {
    return (
      <View style={styles.compact}>
        <Button
          variant="text"
          label={`▶ ${t('audio.play')}`}
          accessibilityHint={t('audio.playLabel')}
          onPress={() => {
            player.play(text, 'normal');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Button
        variant="tonal"
        label={`▶ ${t('audio.play')}`}
        accessibilityHint={t('audio.playLabel')}
        onPress={() => {
          player.play(text, 'normal');
        }}
      />
      <Button
        variant="outlined"
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
      gap: theme.spacing.sm,
    },
    compact: {
      alignItems: 'flex-start',
    },
  });
