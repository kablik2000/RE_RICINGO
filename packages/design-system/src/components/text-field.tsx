import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import type { Theme } from '../theme/theme';
import { useTheme, useThemedStyles } from '../theme/theme-provider';
import { Text } from './text';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Hint under the field (e.g. password rules); replaced by `error` while there is one. */
  supportingText?: string;
  /** Message shown in the error colour; the field is announced as invalid. */
  error?: string;
  secureTextEntry?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  editable?: boolean;
  testID?: string;
}

/** Material 3 outlined text field with the label above it, a supporting text and an error. */
export function TextField({
  label,
  value,
  onChangeText,
  supportingText,
  error,
  secureTextEntry = false,
  autoComplete,
  textContentType,
  keyboardType,
  autoCapitalize = 'sentences',
  returnKeyType,
  onSubmitEditing,
  editable = true,
  testID,
}: TextFieldProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const hasError = error !== undefined && error !== '';
  const borderColor = hasError
    ? theme.colors.error
    : focused
      ? theme.colors.primary
      : theme.colors.outline;
  const below = hasError ? error : supportingText;

  return (
    <View style={styles.container}>
      <Text variant="label" color={hasError ? 'error' : 'onSurfaceVariant'}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        accessibilityHint={below}
        aria-invalid={hasError}
        secureTextEntry={secureTextEntry}
        autoCorrect={false}
        autoCapitalize={autoCapitalize}
        selectionColor={theme.colors.primary}
        editable={editable}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        style={[
          theme.typography.bodyLarge,
          styles.input,
          { color: theme.colors.onSurface, borderColor, borderWidth: focused || hasError ? 2 : 1 },
        ]}
        {...(autoComplete !== undefined && { autoComplete })}
        {...(textContentType !== undefined && { textContentType })}
        {...(keyboardType !== undefined && { keyboardType })}
        {...(returnKeyType !== undefined && { returnKeyType })}
        {...(onSubmitEditing !== undefined && { onSubmitEditing })}
        {...(testID !== undefined && { testID })}
      />
      {below !== undefined && (
        <Text
          variant="bodySmall"
          color={hasError ? 'error' : 'onSurfaceVariant'}
          {...(hasError && { accessibilityRole: 'alert' as const })}>
          {below}
        </Text>
      )}
    </View>
  );
}

const MIN_HEIGHT = 56;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
      alignSelf: 'stretch',
    },
    input: {
      minHeight: MIN_HEIGHT,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface,
    },
  });
