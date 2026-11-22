import { Screen, Surface, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import type { AppConfig } from '@/core/config';
import { t } from '@/core/i18n';

export interface ProfileScreenProps {
  config: AppConfig;
}

/**
 * Profile shell: build information only. Account details and settings arrive with authentication
 * (milestone M2). `config` is injected so the screen stays testable without native constants.
 */
export function ProfileScreen({ config }: ProfileScreenProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Screen title={t('profile.title')}>
      <Surface tone="surfaceContainerLow" style={styles.list}>
        <InfoRow label={t('profile.appVersion')} value={config.appVersion} />
        {config.appEnv !== 'production' && (
          <InfoRow
            label={t('profile.environment')}
            value={t(`profile.environments.${config.appEnv}`)}
          />
        )}
      </Surface>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="body" color="onSurfaceVariant">
        {label}
      </Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
  });
