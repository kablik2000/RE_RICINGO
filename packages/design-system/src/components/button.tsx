import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import type { ColorRole } from '../tokens/color-schemes';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';
export type ButtonSize = 'medium' | 'large';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `large` (56 dp) for a screen's main actions. */
  size?: ButtonSize;
  /** Icon before the label. */
  icon?: IconName;
  /** Icon after the label (e.g. "next" arrows). */
  trailingIcon?: IconName;
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
  size = 'medium',
  icon,
  trailingIcon,
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
        size === 'large' && styles.large,
        icon !== undefined && styles.withLeadingIcon,
        trailingIcon !== undefined && styles.withTrailingIcon,
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
            <View style={styles.content}>
              {icon !== undefined && <Icon name={icon} size={ICON_SIZE} color={colors.content} />}
              <Text variant="label" color={colors.content} numberOfLines={1}>
                {label}
              </Text>
              {trailingIcon !== undefined && (
                <Icon name={trailingIcon} size={ICON_SIZE} color={colors.content} />
              )}
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

const ICON_SIZE = 20;
const LARGE_HEIGHT = 56;

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
    large: {
      minHeight: LARGE_HEIGHT,
    },
    withLeadingIcon: {
      paddingLeft: theme.spacing.lg,
    },
    withTrailingIcon: {
      paddingRight: theme.spacing.lg,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
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
