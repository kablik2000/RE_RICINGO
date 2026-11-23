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
  /**
   * Edge-to-edge element at the top (an illustration), drawn under the status bar; the content
   * below it starts as a rounded sheet overlapping its bottom edge. Scrollable screens only.
   */
  hero?: ReactNode;
  /** Fixed bar above the scrolling content (e.g. a progress header). Scrollable screens only. */
  topBar?: ReactNode;
  /** Fixed bar below the scrolling content (e.g. previous / next). Scrollable screens only. */
  footer?: ReactNode;
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
  hero,
  topBar,
  footer,
  testID,
}: ScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const topInset = safeAreaTop ? insets.top : 0;
  const horizontalInsets = { paddingLeft: insets.left, paddingRight: insets.right };
  // Content scrolls below a pinned status-bar area (it never runs under the clock); a hero draws
  // under the status bar instead.
  const pinTopInset = hero === undefined && topBar === undefined && topInset > 0;
  const insetStyle = {
    paddingTop: 0,
    paddingBottom: footer === undefined ? insets.bottom : 0,
    ...horizontalInsets,
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
      <View
        style={[styles.root, insetStyle, { paddingTop: topInset }]}
        {...(testID !== undefined && { testID })}>
        <View style={[styles.content, styles.fill]}>
          {header}
          {children}
        </View>
      </View>
    );
  }

  const scroll = (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[insetStyle, styles.scrollContent]}
      contentInsetAdjustmentBehavior="never"
      {...(testID !== undefined &&
        topBar === undefined &&
        footer === undefined &&
        !pinTopInset && { testID })}>
      {hero}
      <View style={[styles.content, hero !== undefined && styles.sheet]}>
        {header}
        {children}
      </View>
    </ScrollView>
  );

  if (topBar === undefined && footer === undefined && !pinTopInset) {
    return scroll;
  }

  return (
    <View style={styles.root} {...(testID !== undefined && { testID })}>
      {topBar !== undefined && (
        <View style={[styles.topBar, horizontalInsets, { paddingTop: topInset }]}>{topBar}</View>
      )}
      {pinTopInset && <View style={[styles.topBar, { height: topInset }]} />}
      {scroll}
      {footer !== undefined && (
        <View style={[styles.footer, horizontalInsets, { paddingBottom: insets.bottom }]}>
          <View style={styles.footerContent}>{footer}</View>
        </View>
      )}
    </View>
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
    topBar: {
      backgroundColor: theme.colors.background,
    },
    footer: {
      backgroundColor: theme.colors.background,
      borderTopWidth: theme.sizes.borderWidth,
      borderTopColor: theme.colors.surfaceContainer,
    },
    footerContent: {
      width: '100%',
      maxWidth: theme.sizes.maxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    sheet: {
      marginTop: -theme.spacing.xl,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      backgroundColor: theme.colors.background,
    },
    header: {
      gap: theme.spacing.xs,
    },
  });
