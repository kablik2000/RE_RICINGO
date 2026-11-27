import { Icon, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import type { Solution } from '@ricingo/domain';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { ListenButtons } from '@/features/audio';

/** After checking: right or not, and the right answer with its meaning. */
export function FeedbackPanel({ correct, solution }: { correct: boolean; solution: Solution }) {
  const styles = useThemedStyles(createStyles);
  const onColor = correct ? 'onSuccessContainer' : 'onErrorContainer';
  return (
    <View
      style={[styles.panel, correct ? styles.correct : styles.wrong]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <View style={[styles.badge, correct ? styles.badgeCorrect : styles.badgeWrong]}>
        <Icon name={correct ? 'check' : 'close'} color={correct ? 'onSuccess' : 'onError'} />
      </View>
      <View style={styles.text}>
        <Text variant="titleSmall" color={onColor}>
          {correct ? t('practice.session.correct') : t('practice.session.wrong')}
        </Text>
        {!correct && (
          <Text variant="labelSmall" color={onColor}>
            {t('practice.session.solution')}
          </Text>
        )}
        <Text variant="italianText" color={onColor} accessibilityLanguage="it-IT">
          {solution.italian}
        </Text>
        <Text variant="body" color={onColor}>
          {solution.czech}
        </Text>
      </View>
      <ListenButtons text={solution.italian} compact />
    </View>
  );
}

const BADGE_SIZE = 32;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
    },
    correct: {
      backgroundColor: theme.colors.successContainer,
    },
    wrong: {
      backgroundColor: theme.colors.errorContainer,
    },
    badge: {
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeCorrect: {
      backgroundColor: theme.colors.success,
    },
    badgeWrong: {
      backgroundColor: theme.colors.error,
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
  });
