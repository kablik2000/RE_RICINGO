import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import type { RadiusToken, SpacingToken } from '../tokens/layout';
import type { SurfaceTone } from './surface';

export type CardTone = SurfaceTone | 'primaryContainer';
export type CardVariant = 'filled' | 'outlined';

export interface CardProps {
  children: ReactNode;
  /** Makes the whole card a button. */
  onPress?: () => void;
  /** Required for pressable cards: what a screen reader announces. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** `filled` (tonal background) or `outlined` (surface with a hairline border). */
  variant?: CardVariant;
  tone?: CardTone;
  radius?: RadiusToken;
  /** Inner padding; `none` for cards whose content runs edge to edge (illustrations). */
  padding?: SpacingToken;
  testID?: string;
}

/** Content container; pressable when `onPress` is given (lists of lessons, words…). */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'filled',
  tone = variant === 'outlined' ? 'surface' : 'surfaceContainerLow',
  radius = 'xl',
  padding = 'lg',
  testID,
}: CardProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const containerStyle = [
    styles.card,
    variant === 'outlined' && styles.outlined,
    {
      backgroundColor: theme.colors[tone],
      borderRadius: theme.radius[radius],
      padding: theme.spacing[padding],
    },
  ];

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
      gap: theme.spacing.sm,
      overflow: 'hidden',
    },
    outlined: {
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.outlineVariant,
    },
    stateLayer: {
      ...StyleSheet.absoluteFill,
      opacity: theme.opacity.pressed,
    },
  });
