import type {
  DialogueTurn,
  Lesson,
  LessonBundle,
  Lexeme,
  Sentence,
  Speaker,
} from './lesson-bundle';

/** A sentence in reading order, with the turn and speaker it belongs to. */
export interface SentenceInContext {
  sentence: Sentence;
  turn: DialogueTurn;
  speaker: Speaker;
  /** 0-based position in the whole dialogue. */
  index: number;
}

/** All sentences of the lesson in the order the student walks through them. */
export function listSentencesInOrder(lesson: Lesson): SentenceInContext[] {
  const speakers = new Map(lesson.speakers.map((speaker) => [speaker.id, speaker]));
  const result: SentenceInContext[] = [];
  for (const turn of lesson.turns) {
    const speaker = speakers.get(turn.speakerId);
    if (speaker === undefined) {
      throw new Error(`Turn "${turn.id}" references unknown speaker "${turn.speakerId}".`);
    }
    for (const sentence of turn.sentences) {
      result.push({ sentence, turn, speaker, index: result.length });
    }
  }
  return result;
}

/** Number of conversational exchanges (pairs of turns), as described in spec §3. */
export function countExchanges(lesson: Lesson): number {
  return Math.ceil(lesson.turns.length / 2);
}

/** Where a lexeme occurs in a lesson ("kde se student se slovem setkal", spec §5). */
export interface LexemeOccurrence {
  lexeme: Lexeme;
  sentences: Sentence[];
}

export function findLexemeOccurrences(bundle: LessonBundle): LexemeOccurrence[] {
  return bundle.lexemes.map((lexeme) => ({
    lexeme,
    sentences: bundle.lesson.turns.flatMap((turn) =>
      turn.sentences.filter((sentence) =>
        sentence.segments.some((segment) => segment.lexemeIds.includes(lexeme.id)),
      ),
    ),
  }));
}

/** A run of sentence text: an analysed segment or the plain text (spaces, punctuation) between. */
export type SentencePiece =
  | { kind: 'segment'; text: string; segment: Sentence['segments'][number] }
  | { kind: 'gap'; text: string };

/**
 * Splits the sentence text into analysed segments and the text around them, in reading order, so
 * the UI can render the sentence as typed with tappable segments. Segments that cannot be placed
 * (content not validated) are skipped rather than shown twice.
 */
export function splitSentenceIntoPieces(sentence: Sentence): SentencePiece[] {
  const pieces: SentencePiece[] = [];
  let cursor = 0;
  for (const segment of sentence.segments) {
    const index = sentence.italian.indexOf(segment.text, cursor);
    if (index === -1) {
      continue;
    }
    if (index > cursor) {
      pieces.push({ kind: 'gap', text: sentence.italian.slice(cursor, index) });
    }
    pieces.push({ kind: 'segment', text: segment.text, segment });
    cursor = index + segment.text.length;
  }
  if (cursor < sentence.italian.length) {
    pieces.push({ kind: 'gap', text: sentence.italian.slice(cursor) });
  }
  return pieces;
}
