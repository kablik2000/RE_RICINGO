import { Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import type { ColorRole } from '../tokens/color-schemes';
import { Icon, type IconName } from './icon';

export type IconButtonVariant = 'standard' | 'tonal' | 'filled' | 'surface';
export type IconButtonSize = 'medium' | 'large';

export interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only controls need a spoken name. */
  accessibilityLabel: string;
  onPress: () => void;
  variant?: IconButtonVariant;
  /** `large` is the prominent 56 dp square-ish button (e.g. "play sentence"). */
  size?: IconButtonSize;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

const variantColors: Readonly<
  Record<IconButtonVariant, { container: ColorRole | null; content: ColorRole }>
> = {
  standard: { container: null, content: 'primary' },
  tonal: { container: 'primaryContainer', content: 'onPrimaryContainer' },
  filled: { container: 'primary', content: 'onPrimary' },
  /** Floating over imagery (e.g. a back button on a hero illustration). */
  surface: { container: 'surface', content: 'onSurface' },
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'standard',
  size = 'medium',
  disabled = false,
  accessibilityHint,
  testID,
}: IconButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const colors = variantColors[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      {...(accessibilityHint !== undefined && { accessibilityHint })}
      {...(testID !== undefined && { testID })}
      style={[
        styles.base,
        size === 'large' ? styles.large : styles.medium,
        colors.container !== null && { backgroundColor: theme.colors[colors.container] },
        disabled && styles.disabled,
      ]}>
      {({ pressed }) => (
        <>
          {pressed && (
            <View
              pointerEvents="none"
              style={[styles.stateLayer, { backgroundColor: theme.colors[colors.content] }]}
            />
          )}
          <Icon name={icon} color={colors.content} size={size === 'large' ? 28 : 24} />
        </>
      )}
    </Pressable>
  );
}

const LARGE_SIZE = 56;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    medium: {
      width: theme.sizes.minTouchTarget,
      height: theme.sizes.minTouchTarget,
      borderRadius: theme.radius.full,
    },
    large: {
      width: LARGE_SIZE,
      height: LARGE_SIZE,
      borderRadius: theme.radius.lg,
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
    stateLayer: {
      ...StyleSheet.absoluteFill,
      opacity: theme.opacity.pressed,
    },
  });
