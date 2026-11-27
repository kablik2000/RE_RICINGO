import {
  Card,
  Icon,
  type IconName,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';

export interface PracticeRowProps {
  icon: IconName;
  title: string;
  description?: string;
  status: string;
  onPress: () => void;
}

/** One way to practise: icon, name, what it trains and how much is due. */
export function PracticeRow({ icon, title, description, status, onPress }: PracticeRowProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card
      variant="outlined"
      radius="lg"
      padding="md"
      onPress={onPress}
      accessibilityLabel={[title, description, status].filter(Boolean).join(', ')}
      accessibilityHint={t('practice.startHint')}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name={icon} color="onPrimaryContainer" />
        </View>
        <View style={styles.text}>
          <Text variant="titleSmall">{title}</Text>
          {description !== undefined && (
            <Text variant="body" color="onSurfaceVariant">
              {description}
            </Text>
          )}
          <Text variant="labelSmall" color="primary">
            {status}
          </Text>
        </View>
        <Icon name="chevronRight" color="onSurfaceVariant" />
      </View>
    </Card>
  );
}

const ICON_SIZE = 44;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    icon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
  });
