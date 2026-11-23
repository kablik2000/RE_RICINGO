import { Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';

const EVENING_FROM_HOUR = 17;

/** App name and an Italian greeting that follows the time of day (Buongiorno / Buonasera). */
export function Greeting() {
  const styles = useThemedStyles(createStyles);
  const isEvening = new Date().getHours() >= EVENING_FROM_HOUR;
  return (
    <View style={styles.greeting}>
      <Text variant="label" color="onSurfaceVariant">
        {t('greeting.appName')}
      </Text>
      <Text variant="italianHeadline" accessibilityRole="header" accessibilityLanguage="it-IT">
        {isEvening ? t('greeting.evening') : t('greeting.day')}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    greeting: {
      gap: theme.spacing.xs,
    },
  });
