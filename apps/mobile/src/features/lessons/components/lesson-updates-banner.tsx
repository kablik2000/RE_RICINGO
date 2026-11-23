import { Button, Card, Icon, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';

import { getErrorPresentation } from '@/core/errors';
import { t, tPlural } from '@/core/i18n';
import { useLessonUpdates, type LessonChange } from '@/data';

/**
 * Lesson updates on Home, Lessons and in the settings (Q-18): what changed on the device since
 * the student last looked, and updates waiting for the student's confirmation (mobile data, or
 * the "ask" policy). Renders nothing while there is nothing to say.
 */
export function LessonUpdatesBanner() {
  const { state } = useLessonUpdates();
  if (state.changes.length === 0 && state.offered.length === 0) {
    return null;
  }
  return (
    <>
      {state.changes.length > 0 && <ChangesCard changes={state.changes} />}
      {state.offered.length > 0 && <OfferCard />}
    </>
  );
}

const CHANGE_KINDS: readonly LessonChange['kind'][] = ['added', 'updated', 'removed'];

function ChangesCard({ changes }: { changes: readonly LessonChange[] }) {
  const styles = useThemedStyles(createStyles);
  const { acknowledgeChanges } = useLessonUpdates();
  const anyRemoved = changes.some((change) => change.kind === 'removed');
  return (
    <Card variant="outlined" radius="lg" testID="lesson-changes-card">
      <View style={styles.body}>
        <View style={styles.header}>
          <Icon name="sync" color="primary" />
          <View style={styles.text}>
            <Text variant="titleSmall" accessibilityRole="header">
              {t('lessonUpdates.changes.title')}
            </Text>
            {CHANGE_KINDS.map((kind) => {
              const titles = changes
                .filter((change) => change.kind === kind)
                .map((change) => change.title);
              return titles.length === 0 ? null : (
                <Text key={kind} variant="body">
                  {t(`lessonUpdates.changes.${kind}`, { titles: titles.join(', ') })}
                </Text>
              );
            })}
            {anyRemoved && (
              <Text variant="bodySmall" color="onSurfaceVariant">
                {t('lessonUpdates.changes.removedHint')}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <Button
            label={t('lessonUpdates.changes.dismiss')}
            variant="text"
            onPress={acknowledgeChanges}
          />
        </View>
      </View>
    </Card>
  );
}

function OfferCard() {
  const styles = useThemedStyles(createStyles);
  const { state, downloadOffered, dismissOffer } = useLessonUpdates();
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
