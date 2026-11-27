import { z } from 'zod';

/**
 * Lesson bundle: one published, immutable version of a thematic lesson together with the grammar
 * topics and lexemes it references (docs/ARCHITECTURE.md §5, ADR-0003).
 *
 * Bump CONTENT_SCHEMA_VERSION on any breaking change to this schema; clients declare the highest
 * version they understand.
 */
export const CONTENT_SCHEMA_VERSION = 1;

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'IDs are lowercase kebab-case (stable across versions)');

const nonEmptyText = z.string().trim().min(1);

export const cefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/** Thematic area of a lesson, chosen in the Studio; students browse lessons by it. */
export const lessonThemeSchema = z.enum([
  'everyday',
  'food',
  'travel',
  'shopping',
  'work',
  'free-time',
  'health',
  'culture',
]);

export const partOfSpeechSchema = z.enum([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'article',
  'preposition',
  'conjunction',
  'numeral',
  'interjection',
  'phrase',
]);

export const genderSchema = z.enum(['masculine', 'feminine']);

/**
 * Layered explanation (spec §3 "vrstvení"): basic meaning first, grammatical function second,
 * deeper context and exceptions last. Only `meaning` is mandatory.
 */
export const explanationSchema = z.object({
  meaning: nonEmptyText,
  grammar: nonEmptyText.optional(),
  depth: nonEmptyText.optional(),
});

/** One analysed unit of a sentence, e.g. "un cappuccino". */
export const segmentSchema = z.object({
  id: idSchema,
  /** Exact text as it appears in the sentence. */
  text: nonEmptyText,
  /** Short morphological label, e.g. "condizionale presente · 1. os. j. č.". */
  annotation: nonEmptyText.optional(),
  explanation: explanationSchema,
  lexemeIds: z.array(idSchema).default([]),
  grammarTopicIds: z.array(idSchema).default([]),
});

export const sentenceSchema = z.object({
  id: idSchema,
  italian: nonEmptyText,
  czech: nonEmptyText,
  segments: z.array(segmentSchema).min(1),
});

export const speakerSchema = z.object({
  id: idSchema,
  /** Czech label shown to the student, e.g. "Barista". */
  label: nonEmptyText,
});

export const dialogueTurnSchema = z.object({
  id: idSchema,
  speakerId: idSchema,
  sentences: z.array(sentenceSchema).min(1),
});

export const grammarTopicSchema = z.object({
  id: idSchema,
  title: nonEmptyText,
  summary: nonEmptyText,
});

export const lexemeSchema = z.object({
  id: idSchema,
  lemma: nonEmptyText,
  translation: nonEmptyText,
  partOfSpeech: partOfSpeechSchema,
  gender: genderSchema.optional(),
  note: nonEmptyText.optional(),
});

export const lessonSchema = z.object({
  id: idSchema,
  version: z.number().int().positive(),
  level: cefrLevelSchema,
  /** Optional, so lessons written before themes existed stay valid. */
  theme: lessonThemeSchema.optional(),
  titleItalian: nonEmptyText,
  titleCzech: nonEmptyText,
  goal: nonEmptyText,
  speakers: z.array(speakerSchema).min(1),
  turns: z.array(dialogueTurnSchema).min(1),
});

/**
 * How the lecturer tuned the practice generated from the lesson (ADR-0017). Exercises are built
 * from the lesson's own sentences and words; these lists leave some out (too short, ambiguous).
 * IDs that no longer exist are ignored. Optional, so older apps and bundles stay compatible.
 */
export const practiceSettingsSchema = z.object({
  excludedSentenceIds: z.array(idSchema).default([]),
  excludedLexemeIds: z.array(idSchema).default([]),
});

export const lessonBundleSchema = z.object({
  contentSchemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  lesson: lessonSchema,
  grammarTopics: z.array(grammarTopicSchema),
  lexemes: z.array(lexemeSchema),
  practice: practiceSettingsSchema.optional(),
});

export type CefrLevel = z.infer<typeof cefrLevelSchema>;
export type LessonTheme = z.infer<typeof lessonThemeSchema>;
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;
export type Gender = z.infer<typeof genderSchema>;
export type Explanation = z.infer<typeof explanationSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type Sentence = z.infer<typeof sentenceSchema>;
export type Speaker = z.infer<typeof speakerSchema>;
export type DialogueTurn = z.infer<typeof dialogueTurnSchema>;
export type GrammarTopic = z.infer<typeof grammarTopicSchema>;
export type Lexeme = z.infer<typeof lexemeSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type PracticeSettings = z.infer<typeof practiceSettingsSchema>;
export type LessonBundle = z.infer<typeof lessonBundleSchema>;
