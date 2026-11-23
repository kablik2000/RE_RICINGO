import { StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useThemedStyles } from '../theme/theme-provider';
import { Text } from './text';

export interface ChipProps {
  label: string;
}

/** Compact, non-interactive label (level, grammar topic, word class). */
export function Chip({ label }: ChipProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.chip}>
      <Text variant="labelSmall" color="onSurfaceVariant" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.outlineVariant,
    },
  });
