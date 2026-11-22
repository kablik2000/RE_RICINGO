import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import type { ColorRole } from '../tokens/color-schemes';
import { Text } from './text';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Shows a progress indicator and blocks presses while an action is running. */
  loading?: boolean;
  /** Stretch across the parent. Otherwise the button follows the parent's `alignItems`. */
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

interface VariantColors {
  container: ColorRole | null;
  content: ColorRole;
  border: ColorRole | null;
}

const variantColors: Readonly<Record<ButtonVariant, VariantColors>> = {
  filled: { container: 'primary', content: 'onPrimary', border: null },
  tonal: { container: 'primaryContainer', content: 'onPrimaryContainer', border: null },
  outlined: { container: null, content: 'primary', border: 'outline' },
  text: { container: null, content: 'primary', border: null },
};

export function Button({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const colors = variantColors[variant];
  const contentColor = theme.colors[colors.content];
  const isInactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      {...(accessibilityHint !== undefined && { accessibilityHint })}
      {...(testID !== undefined && { testID })}
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        colors.container !== null && { backgroundColor: theme.colors[colors.container] },
        colors.border !== null && {
          borderWidth: theme.sizes.borderWidth,
          borderColor: theme.colors[colors.border],
        },
        disabled && styles.disabled,
      ]}>
      {({ pressed }) => (
        <>
          {pressed && (
            <View
              pointerEvents="none"
              style={[styles.stateLayer, { backgroundColor: contentColor }]}
            />
          )}
          {loading ? (
            <ActivityIndicator color={contentColor} />
          ) : (
            <Text variant="label" color={colors.content} numberOfLines={1}>
              {label}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: theme.sizes.buttonHeight,
      minWidth: theme.sizes.minTouchTarget,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    fullWidth: {
      alignSelf: 'stretch',
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
    stateLayer: {
      ...StyleSheet.absoluteFill,
      opacity: theme.opacity.pressed,
    },
  });
