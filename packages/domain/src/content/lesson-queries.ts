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
