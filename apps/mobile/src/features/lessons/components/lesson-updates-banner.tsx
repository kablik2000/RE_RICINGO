import { Button, Card, Icon, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { getErrorPresentation } from '@/core/errors';
import { t, tPlural } from '@/core/i18n';
import { useLessonUpdates } from '@/data';

/**
 * Offers downloaded-on-request lesson updates (mobile data, or the "ask" policy, Q-18).
 * Renders nothing while there is nothing to offer.
 */
export function LessonUpdatesBanner() {
  const styles = useThemedStyles(createStyles);
  const { state, downloadOffered, dismissOffer } = useLessonUpdates();
  if (state.offered.length === 0) {
    return null;
  }
  const newCount = state.offered.filter((update) => update.kind === 'new').length;
  const changedCount = state.offered.length - newCount;
  const summary = [
    newCount > 0 ? tPlural('lessonUpdates.offer.newLessons', newCount) : null,
    changedCount > 0 ? tPlural('lessonUpdates.offer.changedLessons', changedCount) : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');
  const downloading = state.phase === 'downloading';

  return (
    <Card tone="primaryContainer" radius="lg" testID="lesson-updates-banner">
      <View style={styles.body}>
        <View style={styles.header}>
          <Icon name="download" color="onPrimaryContainer" />
          <View style={styles.text}>
            <Text variant="titleSmall" color="onPrimaryContainer" accessibilityRole="header">
              {t('lessonUpdates.offer.title')}
            </Text>
            <Text variant="body" color="onPrimaryContainer">
              {summary}
            </Text>
            <Text variant="bodySmall" color="onPrimaryContainer">
              {t('lessonUpdates.offer.hint')}
            </Text>
          </View>
        </View>
        {state.error !== null && (
          <Text variant="bodySmall" color="error" accessibilityRole="alert">
            {t(getErrorPresentation(state.error.kind).messageKey)}
          </Text>
        )}
        <View style={styles.actions}>
          <Button
            label={t('lessonUpdates.offer.later')}
            variant="text"
            onPress={dismissOffer}
            disabled={downloading}
          />
          <Button
            label={t('lessonUpdates.offer.download')}
            icon="download"
            onPress={downloadOffered}
            loading={downloading}
          />
        </View>
      </View>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    body: {
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
    },
  });
