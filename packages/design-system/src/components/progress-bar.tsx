import { StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import type { ColorRole } from '../tokens/color-schemes';

export interface ProgressBarProps {
  /** Progress from 0 to 1 (clamped). */
  value: number;
  /** Announced by screen readers, e.g. "Věta 3 z 11". */
  accessibilityLabel: string;
  /** `thin` (4 dp) inside lists, `regular` (6 dp) for a screen's main progress. */
  size?: 'thin' | 'regular';
  /** Track colour; use a lighter role on tinted backgrounds. */
  trackColor?: ColorRole;
}

const PERCENT = 100;

export function ProgressBar({
  value,
  accessibilityLabel,
  size = 'regular',
  trackColor = 'surfaceContainerHigh',
}: ProgressBarProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * PERCENT);
  return (
    <View
      style={[
        styles.track,
        { height: TRACK_HEIGHT[size], backgroundColor: theme.colors[trackColor] },
      ]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: PERCENT, now: percent }}>
      <View style={[styles.indicator, { width: `${percent}%` }]} />
    </View>
  );
}

const TRACK_HEIGHT = { thin: 4, regular: 6 } as const;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      borderRadius: theme.radius.full,
      overflow: 'hidden',
    },
    indicator: {
      height: '100%',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
  });
