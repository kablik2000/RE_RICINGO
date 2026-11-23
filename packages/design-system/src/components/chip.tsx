import { Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useThemedStyles } from '../theme/theme-provider';
import type { ColorRole } from '../tokens/color-schemes';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ChipVariant = 'outlined' | 'tag';

interface ChipBaseProps {
  label: string;
  icon?: IconName;
}

export interface ChipProps extends ChipBaseProps {
  /** `outlined` (level, topic) or a quieter filled `tag` (word class, grammatical features). */
  variant?: ChipVariant;
}

/** Compact, non-interactive label. */
export function Chip({ label, icon, variant = 'outlined' }: ChipProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.chip, variant === 'tag' ? styles.tag : styles.outlined]}>
      {icon !== undefined && <Icon name={icon} size={ICON_SIZE} />}
      <Text variant="labelSmall" color="onSurfaceVariant" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export interface FilterChipProps extends ChipBaseProps {
  selected: boolean;
  onPress: () => void;
}

/** Material filter chip: toggles a filter; shows a check mark when selected. */
export function FilterChip({ label, icon, selected, onPress }: FilterChipProps) {
  const styles = useThemedStyles(createStyles);
  const content: ColorRole = selected ? 'onPrimaryContainer' : 'onSurfaceVariant';
  const leadingIcon: IconName | undefined = selected ? 'check' : icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        styles.filter,
        selected ? styles.filterSelected : styles.outlined,
        leadingIcon !== undefined && styles.withIcon,
      ]}>
      {leadingIcon !== undefined && <Icon name={leadingIcon} size={ICON_SIZE} color={content} />}
      <Text variant="label" color={content} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const ICON_SIZE = 18;
const FILTER_HEIGHT = 32;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
    },
    outlined: {
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.outlineVariant,
    },
    tag: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      backgroundColor: theme.colors.surfaceContainer,
    },
    filter: {
      minHeight: FILTER_HEIGHT,
      paddingVertical: 0,
    },
    withIcon: {
      paddingLeft: theme.spacing.sm,
    },
    filterSelected: {
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.primaryContainer,
      backgroundColor: theme.colors.primaryContainer,
    },
  });
