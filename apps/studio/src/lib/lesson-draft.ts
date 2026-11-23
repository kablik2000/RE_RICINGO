import type {
  DialogueTurn,
  GrammarTopic,
  LessonBundle,
  Lexeme,
  Segment,
  Sentence,
} from '@ricingo/domain';

/**
 * Pure, immutable operations on a lesson draft for the editor. Every function returns a new
 * bundle and never mutates its input, so React state updates stay predictable and testable.
 */

/** Kebab-case ID part from any text ("Un caffè!" → "un-caffe"); IDs must match the schema. */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'item' : slug.slice(0, 60).replace(/-+$/, '');
}

/** All item IDs used in the dialogue (turns, sentences, segments) — they share one namespace. */
export function itemIds(bundle: LessonBundle): Set<string> {
  const ids = new Set<string>();
  for (const turn of bundle.lesson.turns) {
    ids.add(turn.id);
    for (const sentence of turn.sentences) {
      ids.add(sentence.id);
      for (const segment of sentence.segments) {
        ids.add(segment.id);
      }
    }
  }
  return ids;
}

/** `base`, or `base-2`, `base-3`… — the first one not in `taken`. */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${String(suffix)}`)) {
    suffix += 1;
  }
  return `${base}-${String(suffix)}`;
}

function withLesson(
  bundle: LessonBundle,
  update: (lesson: LessonBundle['lesson']) => LessonBundle['lesson'],
): LessonBundle {
  return { ...bundle, lesson: update(bundle.lesson) };
}

function mapTurns(
  bundle: LessonBundle,
  update: (turn: DialogueTurn) => DialogueTurn,
): LessonBundle {
  return withLesson(bundle, (lesson) => ({ ...lesson, turns: lesson.turns.map(update) }));
}

function mapSentence(
  bundle: LessonBundle,
  sentenceId: string,
  update: (sentence: Sentence) => Sentence,
): LessonBundle {
  return mapTurns(bundle, (turn) => ({
    ...turn,
    sentences: turn.sentences.map((sentence) =>
      sentence.id === sentenceId ? update(sentence) : sentence,
    ),
  }));
}

export function updateLessonInfo(
  bundle: LessonBundle,
  changes: Partial<Pick<LessonBundle['lesson'], 'titleItalian' | 'titleCzech' | 'level' | 'goal'>>,
): LessonBundle {
  return withLesson(bundle, (lesson) => ({ ...lesson, ...changes }));
}

export function renameSpeaker(
  bundle: LessonBundle,
  speakerId: string,
  label: string,
): LessonBundle {
  return withLesson(bundle, (lesson) => ({
    ...lesson,
    speakers: lesson.speakers.map((speaker) =>
      speaker.id === speakerId ? { ...speaker, label } : speaker,
    ),
  }));
}

/** Adds a turn with one empty sentence; the speaker alternates. Returns the new sentence ID. */
export function addTurn(bundle: LessonBundle): { bundle: LessonBundle; sentenceId: string } {
  const { turns, speakers } = bundle.lesson;
  const previous = turns.at(-1)?.speakerId;
  const speaker = speakers.find((candidate) => candidate.id !== previous) ??
    speakers[0] ?? { id: 'speaker-1' };
  const taken = itemIds(bundle);
  const turnId = uniqueId(`turn-${String(turns.length + 1)}`, taken);
  const sentenceId = uniqueId(`${turnId}-sentence-1`, new Set([...taken, turnId]));
  const turn: DialogueTurn = {
    id: turnId,
    speakerId: speaker.id,
    sentences: [{ id: sentenceId, italian: '', czech: '', segments: [] }],
  };
  return {
    bundle: withLesson(bundle, (lesson) => ({ ...lesson, turns: [...lesson.turns, turn] })),
    sentenceId,
  };
}

export function removeTurn(bundle: LessonBundle, turnId: string): LessonBundle {
  return withLesson(bundle, (lesson) => ({
    ...lesson,
    turns: lesson.turns.filter((turn) => turn.id !== turnId),
  }));
}

export function setTurnSpeaker(
  bundle: LessonBundle,
  turnId: string,
  speakerId: string,
): LessonBundle {
  return mapTurns(bundle, (turn) => (turn.id === turnId ? { ...turn, speakerId } : turn));
}

/** Adds an empty sentence to a turn. Returns its ID. */
export function addSentence(
  bundle: LessonBundle,
  turnId: string,
): { bundle: LessonBundle; sentenceId: string } {
  const turn = bundle.lesson.turns.find((candidate) => candidate.id === turnId);
  const sentenceId = uniqueId(
    `${turnId}-sentence-${String((turn?.sentences.length ?? 0) + 1)}`,
    itemIds(bundle),
  );
  return {
    bundle: mapTurns(bundle, (candidate) =>
      candidate.id === turnId
        ? {
            ...candidate,
            sentences: [
              ...candidate.sentences,
              { id: sentenceId, italian: '', czech: '', segments: [] },
            ],
          }
        : candidate,
    ),
    sentenceId,
  };
}

export function removeSentence(bundle: LessonBundle, sentenceId: string): LessonBundle {
  return mapTurns(bundle, (turn) => ({
    ...turn,
    sentences: turn.sentences.filter((sentence) => sentence.id !== sentenceId),
  }));
}

export function updateSentence(
  bundle: LessonBundle,
  sentenceId: string,
  changes: Partial<Pick<Sentence, 'italian' | 'czech'>>,
): LessonBundle {
  return mapSentence(bundle, sentenceId, (sentence) => ({ ...sentence, ...changes }));
}

/**
 * Adds a segment for `text`, which must occur in the sentence. Segments stay in reading order
 * (by first occurrence after the previous segment), as the student app expects. Returns null when
 * the text is not in the sentence.
 */
export function addSegment(
  bundle: LessonBundle,
  sentenceId: string,
  text: string,
): { bundle: LessonBundle; segmentId: string } | null {
  const sentence = bundle.lesson.turns
    .flatMap((turn) => turn.sentences)
    .find((candidate) => candidate.id === sentenceId);
  const trimmed = text.trim();
  if (sentence === undefined || trimmed === '' || !sentence.italian.includes(trimmed)) {
    return null;
  }
  const segmentId = uniqueId(`${sentenceId}-${slugify(trimmed)}`, itemIds(bundle));
  const segment: Segment = {
    id: segmentId,
    text: trimmed,
    explanation: { meaning: '' },
    lexemeIds: [],
    grammarTopicIds: [],
  };
  const position = (candidate: Segment) => sentence.italian.indexOf(candidate.text);
  return {
    bundle: mapSentence(bundle, sentenceId, (current) => ({
      ...current,
      segments: [...current.segments, segment].sort((a, b) => position(a) - position(b)),
    })),
    segmentId,
  };
}

export function removeSegment(
  bundle: LessonBundle,
  sentenceId: string,
  segmentId: string,
): LessonBundle {
  return mapSentence(bundle, sentenceId, (sentence) => ({
    ...sentence,
    segments: sentence.segments.filter((segment) => segment.id !== segmentId),
  }));
}

export interface SegmentChanges {
  annotation?: string;
  meaning?: string;
  grammar?: string;
  depth?: string;
  lexemeIds?: string[];
  grammarTopicIds?: string[];
}

/** Updates a segment. Empty optional texts are removed rather than stored as "". */
export function updateSegment(
  bundle: LessonBundle,
  sentenceId: string,
  segmentId: string,
  changes: SegmentChanges,
): LessonBundle {
  return mapSentence(bundle, sentenceId, (sentence) => ({
    ...sentence,
    segments: sentence.segments.map((segment) => {
      if (segment.id !== segmentId) {
        return segment;
      }
      const explanation = { ...segment.explanation };
      if (changes.meaning !== undefined) explanation.meaning = changes.meaning;
      if (changes.grammar !== undefined) {
        if (changes.grammar.trim() === '') delete explanation.grammar;
        else explanation.grammar = changes.grammar;
      }
      if (changes.depth !== undefined) {
        if (changes.depth.trim() === '') delete explanation.depth;
        else explanation.depth = changes.depth;
      }
      const next: Segment = { ...segment, explanation };
      if (changes.annotation !== undefined) {
        if (changes.annotation.trim() === '') delete next.annotation;
        else next.annotation = changes.annotation;
      }
      if (changes.lexemeIds !== undefined) next.lexemeIds = changes.lexemeIds;
      if (changes.grammarTopicIds !== undefined) next.grammarTopicIds = changes.grammarTopicIds;
      return next;
    }),
  }));
}

export function addLexeme(bundle: LessonBundle): { bundle: LessonBundle; lexemeId: string } {
  const lexemeId = uniqueId(
    `lexeme-${String(bundle.lexemes.length + 1)}`,
    new Set(bundle.lexemes.map((lexeme) => lexeme.id)),
  );
  const lexeme: Lexeme = { id: lexemeId, lemma: '', translation: '', partOfSpeech: 'noun' };
  return { bundle: { ...bundle, lexemes: [...bundle.lexemes, lexeme] }, lexemeId };
}

export function updateLexeme(
  bundle: LessonBundle,
  lexemeId: string,
  changes: Partial<Omit<Lexeme, 'id' | 'gender' | 'note'>> & {
    gender?: NonNullable<Lexeme['gender']> | null;
    note?: string;
  },
): LessonBundle {
  return {
    ...bundle,
    lexemes: bundle.lexemes.map((lexeme) => {
      if (lexeme.id !== lexemeId) return lexeme;
      const { gender, note, ...rest } = changes;
      const next: Lexeme = { ...lexeme, ...rest };
      if (gender === null) delete next.gender;
      else if (gender !== undefined) next.gender = gender;
      if (note !== undefined) {
        if (note.trim() === '') delete next.note;
        else next.note = note;
      }
      return next;
    }),
  };
}

/** Removes a lexeme and every reference to it from segments. */
export function removeLexeme(bundle: LessonBundle, lexemeId: string): LessonBundle {
  const cleaned = mapTurns(bundle, (turn) => ({
    ...turn,
    sentences: turn.sentences.map((sentence) => ({
      ...sentence,
      segments: sentence.segments.map((segment) => ({
        ...segment,
        lexemeIds: segment.lexemeIds.filter((id) => id !== lexemeId),
      })),
    })),
  }));
  return { ...cleaned, lexemes: cleaned.lexemes.filter((lexeme) => lexeme.id !== lexemeId) };
}

export function addGrammarTopic(bundle: LessonBundle): { bundle: LessonBundle; topicId: string } {
  const topicId = uniqueId(
    `topic-${String(bundle.grammarTopics.length + 1)}`,
    new Set(bundle.grammarTopics.map((topic) => topic.id)),
  );
  const topic: GrammarTopic = { id: topicId, title: '', summary: '' };
  return { bundle: { ...bundle, grammarTopics: [...bundle.grammarTopics, topic] }, topicId };
}

export function updateGrammarTopic(
  bundle: LessonBundle,
  topicId: string,
  changes: Partial<Pick<GrammarTopic, 'title' | 'summary'>>,
): LessonBundle {
  return {
    ...bundle,
    grammarTopics: bundle.grammarTopics.map((topic) =>
      topic.id === topicId ? { ...topic, ...changes } : topic,
    ),
  };
}

/** Removes a grammar topic and every reference to it from segments. */
export function removeGrammarTopic(bundle: LessonBundle, topicId: string): LessonBundle {
  const cleaned = mapTurns(bundle, (turn) => ({
    ...turn,
    sentences: turn.sentences.map((sentence) => ({
      ...sentence,
      segments: sentence.segments.map((segment) => ({
        ...segment,
        grammarTopicIds: segment.grammarTopicIds.filter((id) => id !== topicId),
      })),
    })),
  }));
  return {
    ...cleaned,
    grammarTopics: cleaned.grammarTopics.filter((topic) => topic.id !== topicId),
  };
}
