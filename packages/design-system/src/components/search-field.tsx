import { StyleSheet, TextInput, View } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import { Icon } from './icon';
import { IconButton } from './icon-button';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Spoken name of the field. */
  accessibilityLabel: string;
  /** Spoken name of the clear button. */
  clearLabel: string;
  testID?: string;
}

/** Material search bar: rounded, tonal, with a search icon and a clear button. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  clearLabel,
  testID,
}: SearchFieldProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Icon name="search" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        selectionColor={theme.colors.primary}
        style={[theme.typography.bodyLarge, styles.input, { color: theme.colors.onSurface }]}
        {...(testID !== undefined && { testID })}
      />
      {value.length > 0 && (
        <IconButton
          icon="clear"
          accessibilityLabel={clearLabel}
          onPress={() => {
            onChangeText('');
          }}
        />
      )}
    </View>
  );
}

const HEIGHT = 56;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      minHeight: HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingLeft: theme.spacing.lg,
      paddingRight: theme.spacing.xs,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainer,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.md,
    },
  });
