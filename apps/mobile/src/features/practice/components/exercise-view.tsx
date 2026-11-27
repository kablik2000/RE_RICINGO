import { Card, Icon, Text, type Theme, useThemedStyles } from '@ricingo/design-system';
import type { ChoiceExercise, Exercise, FillInBlankExercise } from '@ricingo/domain';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { t, type TranslationKey } from '@/core/i18n';
import { ListenButtons, usePronunciation } from '@/features/audio';

import { OptionList } from './option-list';
import { TileBuilder } from './tile-builder';

export interface ExerciseViewProps {
  exercise: Exercise;
  selected: string | null;
  placed: readonly number[];
  checked: boolean | null;
  onSelect: (option: string) => void;
  onPlace: (tile: number) => void;
  onRemove: (position: number) => void;
}

function instruction(exercise: Exercise): TranslationKey {
  if (exercise.kind === 'vocabulary') {
    return exercise.type === 'choice' && exercise.prompt?.language === 'cs'
      ? 'practice.session.instructions.vocabularyToItalian'
      : 'practice.session.instructions.vocabularyToCzech';
  }
  return `practice.session.instructions.${exercise.kind}`;
}

/** One exercise: the instruction, what to react to and the ways to answer. */
export function ExerciseView(props: ExerciseViewProps) {
  const styles = useThemedStyles(createStyles);
  const { exercise, checked } = props;
  const italianOptions =
    exercise.type === 'fill_in_blank' ||
    exercise.type === 'build' ||
    exercise.optionsLanguage === 'it';
  return (
    <View style={styles.exercise}>
      <Text variant="title" accessibilityRole="header">
        {t(instruction(exercise))}
      </Text>
      {exercise.type === 'choice' && <ChoicePrompt exercise={exercise} />}
      {exercise.type === 'fill_in_blank' && (
        <BlankSentence exercise={exercise} filled={props.selected} />
      )}
      {exercise.type === 'build' ? (
        <>
          <Card variant="filled" padding="xl">
            <Text variant="translation">{exercise.czech}</Text>
          </Card>
          <TileBuilder
            tiles={exercise.tiles}
            placed={props.placed}
            checked={checked}
            onPlace={props.onPlace}
            onRemove={props.onRemove}
          />
        </>
      ) : (
        <OptionList
          options={exercise.options}
          italian={italianOptions}
          language={italianOptions ? 'it-IT' : 'cs-CZ'}
          selected={props.selected}
          answer={checked === null ? null : exercise.answer}
          onSelect={props.onSelect}
        />
      )}
    </View>
  );
}

function ChoicePrompt({ exercise }: { exercise: ChoiceExercise }) {
  const styles = useThemedStyles(createStyles);
  const player = usePronunciation();
  const listening = exercise.prompt === null && exercise.context === null;
  // Listening starts by itself: speech is an external system the screen synchronises with.
  useEffect(() => {
    if (listening && exercise.audio !== null) player.play(exercise.audio, 'normal');
  }, [listening, exercise.audio, player]);

  if (exercise.context !== null) {
    return (
      <Card variant="filled" padding="lg">
        <View style={styles.speaker}>
          <Icon name="person" size={18} color="onSurfaceVariant" />
          <Text variant="label" color="onSurfaceVariant">
            {exercise.context.speaker}
          </Text>
        </View>
        <View style={styles.promptRow}>
          <Text variant="italianText" accessibilityLanguage="it-IT" style={styles.grow}>
            {exercise.context.italian}
          </Text>
          <ListenButtons text={exercise.context.italian} compact />
        </View>
      </Card>
    );
  }
  if (exercise.prompt === null) {
    return (
      <Card variant="filled" padding="xl">
        <View style={styles.listening}>
          <Icon name="headphones" size={32} color="primary" />
          {exercise.audio !== null && <ListenButtons text={exercise.audio} />}
        </View>
      </Card>
    );
  }
  const italian = exercise.prompt.language === 'it';
  return (
    <Card variant="filled" padding="xl">
      <View style={styles.promptRow}>
        <Text
          variant={italian ? 'italianHeadline' : 'headline'}
          {...(italian && { accessibilityLanguage: 'it-IT' })}
          style={styles.grow}>
          {exercise.prompt.text}
        </Text>
        {exercise.audio !== null && <ListenButtons text={exercise.audio} compact />}
      </View>
    </Card>
  );
}

/** Wide enough to read as a gap before an option fills it. */
const EMPTY_GAP = ' '.repeat(6);

/** The sentence with its gap; the chosen option fills it in. */
function BlankSentence({
  exercise,
  filled,
}: {
  exercise: FillInBlankExercise;
  filled: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card variant="filled" padding="xl">
      <Text variant="italianSentence" accessibilityLanguage="it-IT">
        {exercise.before}
        <Text
          variant="italianSentence"
          color={filled === null ? 'onSurfaceVariant' : 'primary'}
          style={styles.blank}
          accessibilityLabel={filled ?? t('practice.session.blank')}>
          {filled ?? EMPTY_GAP}
        </Text>
        {exercise.after}
      </Text>
      <Text variant="translation" color="onSurfaceVariant">
        {exercise.czech}
      </Text>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    exercise: {
      gap: theme.spacing.lg,
    },
    speaker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    promptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    grow: {
      flex: 1,
    },
    listening: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    blank: {
      textDecorationLine: 'underline',
    },
  });
