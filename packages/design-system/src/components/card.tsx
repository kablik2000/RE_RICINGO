import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import type { SurfaceTone } from './surface';

export interface CardProps {
  children: ReactNode;
  /** Makes the whole card a button. */
  onPress?: () => void;
  /** Required for pressable cards: what a screen reader announces. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  tone?: SurfaceTone;
  testID?: string;
}

/** Content container; pressable when `onPress` is given (lists of lessons, words…). */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  tone = 'surfaceContainerLow',
  testID,
}: CardProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const containerStyle = [styles.card, { backgroundColor: theme.colors[tone] }];

  if (onPress === undefined) {
    return (
      <View style={containerStyle} {...(testID !== undefined && { testID })}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      {...(accessibilityLabel !== undefined && { accessibilityLabel })}
      {...(accessibilityHint !== undefined && { accessibilityHint })}
      {...(testID !== undefined && { testID })}
      style={containerStyle}>
      {({ pressed }) => (
        <>
          {pressed && (
            <View
              pointerEvents="none"
              style={[styles.stateLayer, { backgroundColor: theme.colors.onSurface }]}
            />
          )}
          {children}
        </>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      overflow: 'hidden',
    },
    stateLayer: {
      ...StyleSheet.absoluteFill,
      opacity: theme.opacity.pressed,
    },
  });
