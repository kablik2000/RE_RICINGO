import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Theme } from '../theme/theme';
import { useThemedStyles } from '../theme/theme-provider';
import { Text } from './text';

export interface ScreenProps {
  children: ReactNode;
  /** Large in-content title, for screens without a native header. */
  title?: string;
  subtitle?: string;
  /** Scrollable content (default) or a fixed, full-height layout (e.g. centred state views). */
  scrollable?: boolean;
  /** Set to false under a native header, which already covers the top safe area. */
  safeAreaTop?: boolean;
  testID?: string;
}

/**
 * Root container of every screen: background, safe-area insets, consistent padding and a readable
 * maximum content width.
 */
export function Screen({
  children,
  title,
  subtitle,
  scrollable = true,
  safeAreaTop = true,
  testID,
}: ScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const insetStyle = {
    paddingTop: safeAreaTop ? insets.top : 0,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const header =
    title !== undefined ? (
      <View style={styles.header}>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text variant="body" color="onSurfaceVariant">
            {subtitle}
          </Text>
        )}
      </View>
    ) : null;

  if (!scrollable) {
    return (
      <View style={[styles.root, insetStyle]} {...(testID !== undefined && { testID })}>
        <View style={[styles.content, styles.fill]}>
          {header}
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[insetStyle, styles.scrollContent]}
      contentInsetAdjustmentBehavior="never"
      {...(testID !== undefined && { testID })}>
      <View style={styles.content}>
        {header}
        {children}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      width: '100%',
      maxWidth: theme.sizes.maxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    fill: {
      flex: 1,
    },
    header: {
      gap: theme.spacing.xs,
    },
  });
