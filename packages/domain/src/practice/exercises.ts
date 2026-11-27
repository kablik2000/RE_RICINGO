import type { LessonBundle, Lexeme, PartOfSpeech, Segment } from '../content/lesson-bundle';
import { listSentencesInOrder, splitSentenceIntoPieces } from '../content/lesson-queries';

import { pickDistinct, shuffle, type Random } from './random';

/**
 * Practice is generated from the lesson's own content (ADR-0017): words, sentences and their
 * analysed segments. Nothing is authored twice, so every published lesson can be practised.
 */
export const PRACTICE_KINDS = [
  'vocabulary',
  'dialogue',
  'listening',
  'grammar',
  'translation',
] as const;
export type PracticeKind = (typeof PRACTICE_KINDS)[number];

export type Language = 'it' | 'cs';

/** What the student sees after answering: the right answer in Italian and its meaning. */
export interface Solution {
  italian: string;
  czech: string;
}

interface ExerciseBase {
  /** Unique within one generated set. */
  id: string;
  kind: PracticeKind;
  lessonId: string;
  /**
   * The practised item, stable across lesson versions: `<kind>:<lessonId>:<item id>` (a lexeme,
   * sentence or segment ID). Review progress is kept per key.
   */
  itemKey: string;
  /** Grammar topics the item belongs to (filtering practice by topic). */
  grammarTopicIds: readonly string[];
  solution: Solution;
}

/** Pick one option: translate a word, understand what you heard, answer in a dialogue. */
export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  /** Text to read, or `null` when the prompt is only heard (listening). */
  prompt: { text: string; language: Language } | null;
  /** Italian text the app speaks (listening, the other speaker's line). */
  audio: string | null;
  /** The line the student answers (dialogue). */
  context: { speaker: string; italian: string } | null;
  options: readonly string[];
  optionsLanguage: Language;
  answer: string;
}

/** A sentence with one segment left out; the student picks the missing form. */
export interface FillInBlankExercise extends ExerciseBase {
  type: 'fill_in_blank';
  before: string;
  after: string;
  czech: string;
  options: readonly string[];
  answer: string;
}

/** Build the Italian sentence from tiles (the sentence's segments plus a few that do not fit). */
export interface BuildExercise extends ExerciseBase {
  type: 'build';
  czech: string;
  tiles: readonly string[];
  answer: readonly string[];
}

export type Exercise = ChoiceExercise | FillInBlankExercise | BuildExercise;

const CHOICE_DISTRACTORS = 3;
const BLANK_DISTRACTORS = 2;
const TILE_DISTRACTORS = 2;
const MIN_TILES = 2;
const LETTER = /\p{L}/u;

interface Context {
  bundle: LessonBundle;
  random: Random;
  excludedSentences: ReadonlySet<string>;
  excludedLexemes: ReadonlySet<string>;
  lexemes: ReadonlyMap<string, Lexeme>;
}

function createContext(bundle: LessonBundle, random: Random): Context {
  return {
    bundle,
    random,
    excludedSentences: new Set(bundle.practice?.excludedSentenceIds ?? []),
    excludedLexemes: new Set(bundle.practice?.excludedLexemeIds ?? []),
    lexemes: new Map(bundle.lexemes.map((lexeme) => [lexeme.id, lexeme])),
  };
}

function key(kind: PracticeKind, bundle: LessonBundle, itemId: string): string {
  return `${kind}:${bundle.lesson.id}:${itemId}`;
}

function base(
  context: Context,
  kind: PracticeKind,
  itemId: string,
  solution: Solution,
  grammarTopicIds: readonly string[] = [],
) {
  const itemKey = key(kind, context.bundle, itemId);
  return {
    id: itemKey,
    kind,
    lessonId: context.bundle.lesson.id,
    itemKey,
    grammarTopicIds,
    solution,
  };
}

/** Options in random order, or `null` when the lesson has nothing to mix the answer with. */
function options(
  context: Context,
  answer: string,
  preferred: readonly string[],
  others: readonly string[],
  count: number,
): string[] | null {
  const distractors = pickDistinct([preferred, others], answer, count, context.random);
  return distractors.length === 0 ? null : shuffle([answer, ...distractors], context.random);
}

function sentencesFor(context: Context) {
  return listSentencesInOrder(context.bundle.lesson).filter(
    ({ sentence }) => !context.excludedSentences.has(sentence.id),
  );
}

function topicsOf(segments: readonly Segment[]): string[] {
  return [...new Set(segments.flatMap((segment) => segment.grammarTopicIds))];
}

function vocabulary(context: Context): Exercise[] {
  const words = context.bundle.lexemes.filter((lexeme) => !context.excludedLexemes.has(lexeme.id));
  return words.flatMap((lexeme, index): Exercise[] => {
    const samePos = words.filter((other) => other.partOfSpeech === lexeme.partOfSpeech);
    // Alternate directions so both recognition and recall are practised.
    const toCzech = index % 2 === 0;
    const pick = (word: Lexeme) => (toCzech ? word.translation : word.lemma);
    const choices = options(
      context,
      pick(lexeme),
      samePos.map(pick),
      words.map(pick),
      CHOICE_DISTRACTORS,
    );
    if (choices === null) return [];
    return [
      {
        ...base(context, 'vocabulary', lexeme.id, {
          italian: lexeme.lemma,
          czech: lexeme.translation,
        }),
        type: 'choice',
        prompt: toCzech
          ? { text: lexeme.lemma, language: 'it' }
          : { text: lexeme.translation, language: 'cs' },
        audio: toCzech ? lexeme.lemma : null,
        context: null,
        options: choices,
        optionsLanguage: toCzech ? 'cs' : 'it',
        answer: pick(lexeme),
      },
    ];
  });
}

/** Answer the other speaker: the reply is the first sentence of the next turn. */
function dialogue(context: Context): Exercise[] {
  const { lesson } = context.bundle;
  const all = listSentencesInOrder(lesson);
  return all.flatMap((current, index): Exercise[] => {
    const previous = all[index - 1];
    const startsTurn = previous !== undefined && previous.turn.id !== current.turn.id;
    if (!startsTurn || context.excludedSentences.has(current.sentence.id)) return [];
    const replies = all.filter((other) => other.turn.id !== previous.turn.id);
    const choices = options(
      context,
      current.sentence.italian,
      replies
        .filter((other) => other.speaker.id === current.speaker.id)
        .map((o) => o.sentence.italian),
      replies.map((other) => other.sentence.italian),
      CHOICE_DISTRACTORS,
    );
    if (choices === null) return [];
    return [
      {
        ...base(
          context,
          'dialogue',
          current.sentence.id,
          { italian: current.sentence.italian, czech: current.sentence.czech },
          topicsOf(current.sentence.segments),
        ),
        type: 'choice',
        prompt: null,
        audio: previous.sentence.italian,
        context: { speaker: previous.speaker.label, italian: previous.sentence.italian },
        options: choices,
        optionsLanguage: 'it',
        answer: current.sentence.italian,
      },
    ];
  });
}

/** Hear a sentence, pick what it means. */
function listening(context: Context): Exercise[] {
  const sentences = sentencesFor(context);
  const all = listSentencesInOrder(context.bundle.lesson).map(({ sentence }) => sentence.czech);
  return sentences.flatMap(({ sentence }): Exercise[] => {
    const choices = options(context, sentence.czech, [], all, CHOICE_DISTRACTORS);
    if (choices === null) return [];
    return [
      {
        ...base(
          context,
          'listening',
          sentence.id,
          { italian: sentence.italian, czech: sentence.czech },
          topicsOf(sentence.segments),
        ),
        type: 'choice',
        prompt: null,
        audio: sentence.italian,
        context: null,
        options: choices,
        optionsLanguage: 'cs',
        answer: sentence.czech,
      },
    ];
  });
}

/** The form fits the gap: lower-case it in the middle of a sentence, capitalise it at the start. */
function inCaseOf(answer: string, text: string): string {
  const first = answer.charAt(0);
  const upper = first !== first.toLowerCase();
  const head = text.charAt(0);
  return (upper ? head.toUpperCase() : head.toLowerCase()) + text.slice(1);
}

function partOfSpeech(context: Context, segment: Segment): PartOfSpeech | undefined {
  const lexemeId = segment.lexemeIds[0];
  return lexemeId === undefined ? undefined : context.lexemes.get(lexemeId)?.partOfSpeech;
}

/** A sentence with one grammar-linked segment left out. */
function grammar(context: Context): Exercise[] {
  const everySegment = listSentencesInOrder(context.bundle.lesson).flatMap(
    ({ sentence }) => sentence.segments,
  );
  return sentencesFor(context).flatMap(({ sentence }) => {
    const pieces = splitSentenceIntoPieces(sentence);
    return pieces.flatMap((piece, index): Exercise[] => {
      if (piece.kind !== 'segment' || piece.segment.grammarTopicIds.length === 0) return [];
      const { segment } = piece;
      const pos = partOfSpeech(context, segment);
      const sharesTopic = (other: Segment) =>
        other.grammarTopicIds.some((topic) => segment.grammarTopicIds.includes(topic));
      const choices = options(
        context,
        segment.text,
        everySegment
          .filter(
            (other) =>
              sharesTopic(other) || (pos !== undefined && partOfSpeech(context, other) === pos),
          )
          .map((other) => inCaseOf(segment.text, other.text)),
        everySegment.map((other) => inCaseOf(segment.text, other.text)),
        BLANK_DISTRACTORS,
      );
      if (choices === null) return [];
      const text = (part: typeof pieces) => part.map((p) => p.text).join('');
      return [
        {
          ...base(
            context,
            'grammar',
            segment.id,
            { italian: sentence.italian, czech: sentence.czech },
            segment.grammarTopicIds,
          ),
          id: `${key('grammar', context.bundle, segment.id)}@${sentence.id}`,
          type: 'fill_in_blank',
          before: text(pieces.slice(0, index)),
          after: text(pieces.slice(index + 1)),
          czech: sentence.czech,
          options: choices,
          answer: segment.text,
        },
      ];
    });
  });
}

/** The first tile starts lower-case, so its capital letter does not give the order away. */
function asTile(text: string, first: boolean): string {
  return first ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** Translate the Czech sentence by putting its Italian segments in order. */
function translation(context: Context): Exercise[] {
  const everySegment = listSentencesInOrder(context.bundle.lesson).flatMap(
    ({ sentence }) => sentence.segments,
  );
  return sentencesFor(context).flatMap(({ sentence }): Exercise[] => {
    const pieces = splitSentenceIntoPieces(sentence);
    // Words outside segments cannot be built from tiles.
    const buildable = pieces.every((piece) => piece.kind === 'segment' || !LETTER.test(piece.text));
    const answer = pieces
      .filter((piece) => piece.kind === 'segment')
      .map((piece, index) => asTile(piece.text, index === 0));
    if (!buildable || answer.length < MIN_TILES) return [];
    const extra = pickDistinct(
      [everySegment.map((segment) => segment.text.toLowerCase())],
      '',
      TILE_DISTRACTORS,
      context.random,
      answer,
    );
    return [
      {
        ...base(
          context,
          'translation',
          sentence.id,
          { italian: sentence.italian, czech: sentence.czech },
          topicsOf(sentence.segments),
        ),
        type: 'build',
        czech: sentence.czech,
        tiles: shuffle([...answer, ...extra], context.random),
        answer,
      },
    ];
  });
}

const GENERATORS: Readonly<Record<PracticeKind, (context: Context) => Exercise[]>> = {
  vocabulary,
  dialogue,
  listening,
  grammar,
  translation,
};

/** Every exercise of one kind the lesson offers; option order depends on `random`. */
export function generateExercises(
  bundle: LessonBundle,
  kind: PracticeKind,
  random: Random = Math.random,
): Exercise[] {
  return GENERATORS[kind](createContext(bundle, random));
}

/** True when the student's answer is right (options compare as text, tiles in order). */
export function isCorrectAnswer(exercise: Exercise, answer: string | readonly string[]): boolean {
  if (exercise.type === 'build') {
    return (
      typeof answer !== 'string' &&
      answer.length === exercise.answer.length &&
      answer.every((tile, index) => tile === exercise.answer[index])
    );
  }
  return typeof answer === 'string' && answer === exercise.answer;
}
