import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import { Button } from './button';
import { Text } from './text';

/*
 * Shared loading / empty / error states. All user-facing text is passed in by the caller
 * (the design system holds no copy, so it stays independent of the app's i18n).
 */

export interface LoadingStateProps {
  /** Announced to screen readers; shown under the indicator when provided. */
  message: string;
  showMessage?: boolean;
}

export function LoadingState({ message, showMessage = false }: LoadingStateProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      {showMessage && (
        <Text variant="body" color="onSurfaceVariant" align="center">
          {message}
        </Text>
      )}
    </View>
  );
}

export interface StateAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: StateAction;
  /** Optional illustration or icon rendered above the title. */
  visual?: ReactNode;
}

export function EmptyState({ title, message, action, visual }: EmptyStateProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {visual}
      <Text variant="title" align="center" accessibilityRole="header">
        {title}
      </Text>
      {message !== undefined && (
        <Text variant="body" color="onSurfaceVariant" align="center">
          {message}
        </Text>
      )}
      {action !== undefined && (
        <Button label={action.label} onPress={action.onPress} variant="tonal" />
      )}
    </View>
  );
}

export interface ErrorStateProps {
  title: string;
  message?: string;
  /** Omit for errors that retrying cannot fix. */
  retry?: StateAction;
}

export function ErrorState({ title, message, retry }: ErrorStateProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text variant="title" color="error" align="center" accessibilityRole="alert">
        {title}
      </Text>
      {message !== undefined && (
        <Text variant="body" color="onSurfaceVariant" align="center">
          {message}
        </Text>
      )}
      {retry !== undefined && <Button label={retry.label} onPress={retry.onPress} />}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
    },
  });
