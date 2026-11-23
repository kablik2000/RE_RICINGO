import { Button, Icon, Text, type Theme, useTheme, useThemedStyles } from '@ricingo/design-system';
import { Pressable, StyleSheet, View } from 'react-native';

import { getErrorPresentation } from '@/core/errors';
import { t } from '@/core/i18n';
import {
  UPDATE_POLICIES,
  useLessonUpdates,
  useSetUpdatePolicy,
  useUpdatePolicy,
  type UpdatePolicy,
} from '@/data';
import { LessonUpdatesBanner } from '@/features/lessons';

const CHECKED_AT_FORMAT = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Profile → "Aktualizace lekcí": when updates download, plus a manual check (Q-18). */
export function LessonUpdateSettings() {
  const styles = useThemedStyles(createStyles);
  const policy = useUpdatePolicy();
  const setPolicy = useSetUpdatePolicy();
  const updates = useLessonUpdates();
  const { state } = updates;
  const selected = setPolicy.isPending ? setPolicy.variables : policy.data;

  return (
    <View style={styles.section}>
      <Text variant="titleSmall" accessibilityRole="header">
        {t('lessonUpdates.settings.title')}
      </Text>
      <Text variant="body" color="onSurfaceVariant">
        {t('lessonUpdates.settings.description')}
      </Text>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {UPDATE_POLICIES.map((option) => (
          <PolicyOption
            key={option}
            policy={option}
            checked={selected === option}
            onSelect={() => {
              setPolicy.mutate(option);
            }}
          />
        ))}
      </View>

      {updates.enabled ? (
        <View style={styles.check}>
          <View style={styles.banner}>
            <LessonUpdatesBanner />
          </View>
          <Button
            label={t('lessonUpdates.settings.check')}
            icon="sync"
            variant="outlined"
            onPress={updates.check}
            loading={state.phase !== 'idle'}
          />
          {state.error !== null && state.offered.length === 0 ? (
            <Text variant="bodySmall" color="error" accessibilityRole="alert">
              {t(getErrorPresentation(state.error.kind).messageKey)}
            </Text>
          ) : (
            state.lastCheckedAt !== null && (
              <Text variant="bodySmall" color="onSurfaceVariant">
                {state.offered.length === 0 ? `${t('lessonUpdates.settings.upToDate')} ` : ''}
                {t('lessonUpdates.settings.lastChecked', {
                  time: CHECKED_AT_FORMAT.format(state.lastCheckedAt),
                })}
              </Text>
            )
          )}
        </View>
      ) : (
        <Text variant="bodySmall" color="onSurfaceVariant">
          {t('lessonUpdates.settings.unavailable')}
        </Text>
      )}
    </View>
  );
}

function PolicyOption({
  policy,
  checked,
  onSelect,
}: {
  policy: UpdatePolicy;
  checked: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const label = t(`lessonUpdates.settings.policies.${policy}.label`);
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        pressed && { backgroundColor: theme.colors.surfaceContainer },
      ]}>
      <Icon
        name={checked ? 'radioOn' : 'radioOff'}
        color={checked ? 'primary' : 'onSurfaceVariant'}
      />
      <View style={styles.optionText}>
        <Text variant="bodyLarge">{label}</Text>
        <Text variant="body" color="onSurfaceVariant">
          {t(`lessonUpdates.settings.policies.${policy}.supporting`)}
        </Text>
      </View>
    </Pressable>
  );
}

const OPTION_MIN_HEIGHT = 56;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      gap: theme.spacing.md,
    },
    options: {
      gap: theme.spacing.xs,
    },
    option: {
      minHeight: OPTION_MIN_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    optionText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    check: {
      gap: theme.spacing.md,
      alignItems: 'flex-start',
    },
    banner: {
      alignSelf: 'stretch',
    },
  });
