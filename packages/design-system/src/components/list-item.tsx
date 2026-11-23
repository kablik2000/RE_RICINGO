import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import type { TypographyRole } from '../tokens/typography';
import { Text } from './text';

export interface ListItemProps {
  title: string;
  /** e.g. `italianText` for Italian words. */
  titleVariant?: TypographyRole;
  /** Language of the title, read by screen readers (e.g. "it-IT"). */
  titleLanguage?: string;
  /** Small element right after the title (a gender tag…). */
  titleAccessory?: ReactNode;
  supporting?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** Material list row: optional leading element, title + supporting text, trailing control. */
export function ListItem({
  title,
  titleVariant = 'bodyLarge',
  titleLanguage,
  titleAccessory,
  supporting,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ListItemProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const body = (
    <>
      {leading}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text
            variant={titleVariant}
            {...(titleLanguage !== undefined && { accessibilityLanguage: titleLanguage })}>
            {title}
          </Text>
          {titleAccessory}
        </View>
        {typeof supporting === 'string' ? (
          <Text variant="body" color="onSurfaceVariant">
            {supporting}
          </Text>
        ) : (
          supporting
        )}
      </View>
      {trailing}
    </>
  );

  if (onPress === undefined) {
    return (
      <View style={styles.row} {...(testID !== undefined && { testID })}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      {...(accessibilityLabel !== undefined && { accessibilityLabel })}
      {...(accessibilityHint !== undefined && { accessibilityHint })}
      {...(testID !== undefined && { testID })}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.colors.surfaceContainer },
      ]}>
      {body}
    </Pressable>
  );
}

const MIN_HEIGHT = 56;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: MIN_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    titleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  });
