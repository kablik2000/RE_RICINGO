import { StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useThemedStyles } from '../theme/theme-provider';

export interface ProgressBarProps {
  /** Progress from 0 to 1 (clamped). */
  value: number;
  /** Announced by screen readers, e.g. "Věta 3 z 11". */
  accessibilityLabel: string;
}

const PERCENT = 100;

export function ProgressBar({ value, accessibilityLabel }: ProgressBarProps) {
  const styles = useThemedStyles(createStyles);
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * PERCENT);
  return (
    <View
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: PERCENT, now: percent }}>
      <View style={[styles.indicator, { width: `${percent}%` }]} />
    </View>
  );
}

const TRACK_HEIGHT = 4;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      height: TRACK_HEIGHT,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      overflow: 'hidden',
    },
    indicator: {
      height: '100%',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
  });
