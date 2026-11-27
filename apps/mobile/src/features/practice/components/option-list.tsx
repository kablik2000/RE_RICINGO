import { Icon, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { Pressable, StyleSheet, View } from 'react-native';

export interface OptionListProps {
  options: readonly string[];
  /** BCP 47 tag of the options' language, for screen readers. */
  language: string;
  italian: boolean;
  selected: string | null;
  /** After checking: the right answer; `null` while the student is answering. */
  answer: string | null;
  onSelect: (option: string) => void;
}

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

/** The options of a choice or fill-in exercise; after checking, the right one turns green. */
export function OptionList({
  options,
  language,
  italian,
  selected,
  answer,
  onSelect,
}: OptionListProps) {
  const styles = useThemedStyles(createStyles);
  const checked = answer !== null;
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {options.map((option) => {
        const state: OptionState = !checked
          ? option === selected
            ? 'selected'
            : 'idle'
          : option === answer
            ? 'correct'
            : option === selected
              ? 'wrong'
              : 'idle';
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: option === selected, disabled: checked }}
            accessibilityLanguage={language}
            disabled={checked}
            onPress={() => {
              onSelect(option);
            }}
            style={({ pressed }) => [
              styles.option,
              styles[state],
              pressed && state === 'idle' && styles.pressed,
            ]}>
            <Text
              variant={italian ? 'italianText' : 'bodyLarge'}
              color={
                state === 'correct'
                  ? 'onSuccessContainer'
                  : state === 'wrong'
                    ? 'onErrorContainer'
                    : 'onSurface'
              }
              style={styles.label}>
              {option}
            </Text>
            {state === 'correct' && <Icon name="check" color="onSuccessContainer" />}
            {state === 'wrong' && <Icon name="close" color="onErrorContainer" />}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: theme.spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: theme.sizes.minTouchTarget,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
    },
    idle: {
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    selected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
    },
    correct: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.successContainer,
    },
    wrong: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorContainer,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceContainer,
    },
    label: {
      flex: 1,
    },
  });
