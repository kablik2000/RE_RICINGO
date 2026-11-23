import { lessonBundleSchema, type LessonBundle } from './lesson-bundle';

export interface ContentIssue {
  /** Where the problem is, e.g. "turns[2].sentences[0].segments[1]". */
  path: string;
  message: string;
}

export type LessonBundleValidation =
  { ok: true; bundle: LessonBundle } | { ok: false; issues: readonly ContentIssue[] };

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  return [...duplicates];
}

/** Checks that segments appear in their sentence, in order and without overlap. */
function checkSegmentOrder(italian: string, segments: readonly { text: string }[]): string | null {
  let cursor = 0;
  for (const segment of segments) {
    const index = italian.indexOf(segment.text, cursor);
    if (index === -1) {
      return `segment "${segment.text}" is not found in "${italian}" after position ${cursor}`;
    }
    cursor = index + segment.text.length;
  }
  return null;
}

/**
 * Structural (schema) and semantic validation of a lesson bundle: unique stable IDs, valid
 * references to speakers, lexemes and grammar topics, and segments that match the sentence text.
 * Used by the app when loading content and, later, by the content compiler and Teacher Studio.
 */
export function validateLessonBundle(input: unknown): LessonBundleValidation {
  const parsed = lessonBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const bundle = parsed.data;
  const { lesson } = bundle;
  const issues: ContentIssue[] = [];

  const speakerIds = new Set(lesson.speakers.map((speaker) => speaker.id));
  const lexemeIds = new Set(bundle.lexemes.map((lexeme) => lexeme.id));
  const topicIds = new Set(bundle.grammarTopics.map((topic) => topic.id));

  const allItemIds = [
    ...lesson.turns.map((turn) => turn.id),
    ...lesson.turns.flatMap((turn) => turn.sentences.map((sentence) => sentence.id)),
    ...lesson.turns.flatMap((turn) =>
      turn.sentences.flatMap((sentence) => sentence.segments.map((segment) => segment.id)),
    ),
  ];
  for (const id of findDuplicates(allItemIds)) {
    issues.push({ path: 'lesson', message: `duplicate item id "${id}"` });
  }
  for (const id of findDuplicates(bundle.lexemes.map((lexeme) => lexeme.id))) {
    issues.push({ path: 'lexemes', message: `duplicate lexeme id "${id}"` });
  }
  for (const id of findDuplicates(bundle.grammarTopics.map((topic) => topic.id))) {
    issues.push({ path: 'grammarTopics', message: `duplicate grammar topic id "${id}"` });
  }

  lesson.turns.forEach((turn, turnIndex) => {
    const turnPath = `lesson.turns.${turnIndex}`;
    if (!speakerIds.has(turn.speakerId)) {
      issues.push({ path: turnPath, message: `unknown speaker "${turn.speakerId}"` });
    }
    turn.sentences.forEach((sentence, sentenceIndex) => {
      const sentencePath = `${turnPath}.sentences.${sentenceIndex}`;
      const orderProblem = checkSegmentOrder(sentence.italian, sentence.segments);
      if (orderProblem !== null) {
        issues.push({ path: sentencePath, message: orderProblem });
      }
      sentence.segments.forEach((segment, segmentIndex) => {
        const segmentPath = `${sentencePath}.segments.${segmentIndex}`;
        for (const id of segment.lexemeIds) {
          if (!lexemeIds.has(id)) {
            issues.push({ path: segmentPath, message: `unknown lexeme "${id}"` });
          }
        }
        for (const id of segment.grammarTopicIds) {
          if (!topicIds.has(id)) {
            issues.push({ path: segmentPath, message: `unknown grammar topic "${id}"` });
          }
        }
      });
    });
  });

  return issues.length === 0 ? { ok: true, bundle } : { ok: false, issues };
}
