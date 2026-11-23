import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useThemedStyles } from '../theme/theme-provider';
import { Text } from './text';

export interface DisclosureProps {
  title: string;
  children: ReactNode;
  initiallyExpanded?: boolean;
}

/**
 * Expandable section. Used for layered explanations: the student opens deeper layers only when
 * ready, so beginners are not overwhelmed (spec §3).
 */
export function Disclosure({ title, children, initiallyExpanded = false }: DisclosureProps) {
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
        <Text variant="label" color="primary">
          {title}
        </Text>
        <Text variant="label" color="primary" importantForAccessibility="no">
          {expanded ? '−' : '+'}
        </Text>
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
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    content: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
  });
