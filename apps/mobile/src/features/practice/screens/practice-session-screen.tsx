import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  ProgressBar,
  Screen,
  Text,
  type Theme,
  useThemedStyles,
} from '@ricingo/design-system';
import {
  canCheck,
  currentAnswer,
  currentExercise,
  isCorrectAnswer,
  practiceSessionReducer,
  startSession,
  type Exercise,
  type PracticeFilter,
  type PracticeResult,
} from '@ricingo/domain';
import { useRouter } from 'expo-router';
import { useReducer } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/core/i18n';
import { QueryView } from '@/core/ui';
import { usePracticeSession, useRecordPractice } from '@/data';
import { ItalianVoiceNotice } from '@/features/audio';

import { ExerciseView } from '../components/exercise-view';
import { FeedbackPanel } from '../components/feedback-panel';

/** A practice session (ADR-0017): up to ten exercises, then a summary. */
export function PracticeSessionScreen({ filter }: { filter: PracticeFilter }) {
  const session = usePracticeSession(filter);
  return (
    <QueryView query={session} loadingMessage={t('practice.loading')}>
      {(exercises) =>
        exercises.length === 0 ? (
          <Screen topBar={<SessionTopBar position={0} total={0} />}>
            <EmptyState
              title={t('practice.session.empty.title')}
              message={t('practice.session.empty.message')}
            />
          </Screen>
        ) : (
          // A new plan (practise again) starts a new session.
          <Session
            key={session.dataUpdatedAt}
            exercises={exercises}
            onAgain={() => {
              void session.refetch();
            }}
          />
        )
      }
    </QueryView>
  );
}

function Session({ exercises, onAgain }: { exercises: readonly Exercise[]; onAgain: () => void }) {
  const styles = useThemedStyles(createStyles);
  const [state, dispatch] = useReducer(practiceSessionReducer, exercises, startSession);
  const record = useRecordPractice();
  const exercise = currentExercise(state);

  if (exercise === undefined) {
    return <Summary results={state.results} saveFailed={record.isError} onAgain={onAgain} />;
  }

  const isLast = state.index === state.exercises.length - 1;
  const check = () => {
    const answer = currentAnswer(state);
    if (!canCheck(state) || answer === null) return;
    // Saved per answer, so leaving in the middle keeps what was practised.
    record.mutate([
      {
        exerciseId: exercise.id,
        itemKey: exercise.itemKey,
        correct: isCorrectAnswer(exercise, answer),
      },
    ]);
    dispatch({ type: 'check' });
  };

  return (
    <Screen
      topBar={<SessionTopBar position={state.index + 1} total={state.exercises.length} />}
      footer={
        <View style={styles.footer}>
          {state.checked !== null && (
            <FeedbackPanel correct={state.checked} solution={exercise.solution} />
          )}
          {state.checked === null ? (
            <Button
              fullWidth
              size="large"
              label={t('practice.session.check')}
              disabled={!canCheck(state)}
              onPress={check}
            />
          ) : (
            <Button
              fullWidth
              size="large"
              trailingIcon="forward"
              label={isLast ? t('practice.session.finish') : t('practice.session.next')}
              onPress={() => {
                dispatch({ type: 'next' });
              }}
            />
          )}
        </View>
      }>
      {/* Keyed by exercise so speech and scroll start fresh for each one. */}
      <ExerciseView
        key={`${exercise.id}#${String(state.index)}`}
        exercise={exercise}
        selected={state.selected}
        placed={state.placed}
        checked={state.checked}
        onSelect={(option) => {
          dispatch({ type: 'select', option });
        }}
        onPlace={(tile) => {
          dispatch({ type: 'placeTile', tile });
        }}
        onRemove={(position) => {
          dispatch({ type: 'removeTile', position });
        }}
      />
      <ItalianVoiceNotice />
    </Screen>
  );
}

function Summary({
  results,
  saveFailed,
  onAgain,
}: {
  results: readonly PracticeResult[];
  saveFailed: boolean;
  onAgain: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const correct = results.filter((result) => result.correct).length;
  const perfect = correct === results.length;
  return (
    <Screen
      topBar={<SessionTopBar position={results.length} total={results.length} />}
      footer={
        <View style={styles.footer}>
          <Button
            fullWidth
            size="large"
            icon="sync"
            label={t('practice.summary.again')}
            onPress={onAgain}
          />
          <Button
            fullWidth
            size="large"
            variant="outlined"
            label={t('practice.summary.back')}
            onPress={() => {
              router.back();
            }}
          />
        </View>
      }>
      <View style={styles.summary}>
        <View style={styles.summaryBadge}>
          <Icon name={perfect ? 'check' : 'idea'} size={40} color="onPrimaryContainer" />
        </View>
        <Text variant="italianHeadline" accessibilityRole="header">
          {t('practice.summary.title')}
        </Text>
        <Text variant="title">
          {t('practice.summary.score', { correct, total: results.length })}
        </Text>
        <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.centered}>
          {perfect ? t('practice.summary.perfect') : t('practice.summary.keepGoing')}
        </Text>
        {saveFailed && (
          <Text variant="body" color="error">
            {t('practice.summary.saveFailed')}
          </Text>
        )}
      </View>
    </Screen>
  );
}

function SessionTopBar({ position, total }: { position: number; total: number }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const label = t('practice.session.progress', { current: position, total });
  return (
    <View style={styles.topBar}>
      <IconButton
        icon="close"
        accessibilityLabel={t('practice.session.close')}
        onPress={() => {
          router.back();
        }}
      />
      <View style={styles.progress}>
        <ProgressBar value={total === 0 ? 0 : position / total} accessibilityLabel={label} />
      </View>
      {total > 0 && (
        <Text variant="labelSmall" color="onSurfaceVariant">
          {label}
        </Text>
      )}
    </View>
  );
}

const SUMMARY_BADGE_SIZE = 88;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      paddingRight: theme.spacing.lg,
      paddingBottom: theme.spacing.xs,
    },
    progress: {
      flex: 1,
    },
    footer: {
      gap: theme.spacing.md,
    },
    summary: {
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.xxl,
    },
    summaryBadge: {
      width: SUMMARY_BADGE_SIZE,
      height: SUMMARY_BADGE_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centered: {
      textAlign: 'center',
    },
  });
