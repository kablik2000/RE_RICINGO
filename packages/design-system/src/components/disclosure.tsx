import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useThemedStyles } from '../theme/theme-provider';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface DisclosureProps {
  title: string;
  children: ReactNode;
  initiallyExpanded?: boolean;
  /** Leading icon (e.g. `idea` for deeper context). */
  icon?: IconName;
}

/**
 * Expandable section. Used for layered explanations: the student opens deeper layers only when
 * ready, so beginners are not overwhelmed (spec §3).
 */
export function Disclosure({ title, children, initiallyExpanded = false, icon }: DisclosureProps) {
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <View>
      <Pressable
        onPress={() => {
          setExpanded((value) => !value);
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        style={styles.header}>
        {icon !== undefined && <Icon name={icon} color="primary" />}
        <Text variant="label" style={styles.title}>
          {title}
        </Text>
        <Icon name={expanded ? 'collapse' : 'expand'} />
      </Pressable>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      minHeight: theme.sizes.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    title: {
      flex: 1,
    },
    content: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
  });
