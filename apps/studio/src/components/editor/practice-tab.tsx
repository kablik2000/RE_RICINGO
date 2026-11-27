'use client';

import {
  type Exercise,
  generateExercises,
  type LessonBundle,
  listSentencesInOrder,
  PRACTICE_KINDS,
  type PracticeKind,
  seededRandom,
  validateLessonBundle,
} from '@ricingo/domain';
import { useMemo, useState } from 'react';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { setPracticeExcluded } from '@/lib/lesson-draft';

import styles from './practice-tab.module.css';

type Generated = Record<PracticeKind, Exercise[]>;

/** The same seed every time, so the preview does not reshuffle while the lecturer edits. */
const PREVIEW_SEED = 1;

/** The exercises the app generates from the draft, or `null` while the draft has errors. */
function generate(draft: LessonBundle): Generated | null {
  const result = validateLessonBundle(draft);
  if (!result.ok) return null;
  return Object.fromEntries(
    PRACTICE_KINDS.map((kind) => [
      kind,
      generateExercises(result.bundle, kind, seededRandom(PREVIEW_SEED)),
    ]),
  ) as Generated;
}

/**
 * Practice generated from the lesson (ADR-0017): a preview of every exercise as students get it,
 * and which sentences and words take part.
 */
export function PracticeTab({
  draft,
  onChange,
}: {
  draft: LessonBundle;
  onChange: (draft: LessonBundle) => void;
}) {
  const [kind, setKind] = useState<PracticeKind>('vocabulary');
  const generated = useMemo(() => generate(draft), [draft]);
  const excludedSentences = new Set(draft.practice?.excludedSentenceIds ?? []);
  const excludedWords = new Set(draft.practice?.excludedLexemeIds ?? []);
  const sentences = useMemo(() => {
    try {
      return listSentencesInOrder(draft.lesson).map((item) => item.sentence);
    } catch {
      // A turn with an unknown speaker: the issues panel reports it; list sentences anyway.
      return draft.lesson.turns.flatMap((turn) => turn.sentences);
    }
  }, [draft.lesson]);

  return (
    <div className={styles.layout}>
      <section className={`${ui.card ?? ''} ${styles.card ?? ''}`}>
        <h2 className={ui.cardTitle}>{t('editor.practice.title')}</h2>
        <p className={ui.muted}>{t('editor.practice.intro')}</p>

        {generated === null ? (
          <p className={styles.notice} role="status">
            <Icon name="info" size={20} />
            {t('editor.practice.invalid')}
          </p>
        ) : (
          <>
            <div
              className={styles.kinds}
              role="radiogroup"
              aria-label={t('editor.practice.kindsLabel')}>
              {PRACTICE_KINDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={kind === item}
                  className={`${ui.filterChip ?? ''} ${kind === item ? (ui.filterChipSelected ?? '') : ''}`}
                  onClick={() => {
                    setKind(item);
                  }}>
                  {kind === item && <Icon name="check" size={18} />}
                  {t(`editor.practice.kinds.${item}`, { count: generated[item].length })}
                </button>
              ))}
            </div>
            <p className={ui.muted}>
              {t(`editor.practice.kindHints.${kind}`)} {t('editor.practice.previewNote')}
            </p>
            <h3 className={styles.subtitle}>{t('editor.practice.previewTitle')}</h3>
            {generated[kind].length === 0 ? (
              <p className={ui.muted}>{t('editor.practice.previewEmpty')}</p>
            ) : (
              <ol className={styles.exercises}>
                {generated[kind].map((exercise) => (
                  <li key={exercise.id} className={styles.exercise}>
                    <ExercisePreview exercise={exercise} />
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>

      <section className={`${ui.card ?? ''} ${styles.card ?? ''}`}>
        <h2 className={ui.cardTitle}>{t('editor.practice.includeTitle')}</h2>

        <fieldset className={styles.group}>
          <legend className={styles.subtitle}>
            {t('editor.practice.sentences')}
            {excludedSentences.size > 0 && (
              <span className={`${ui.chip ?? ''} ${ui.statusDraft ?? ''}`}>
                {t('editor.practice.excludedCount', { count: excludedSentences.size })}
              </span>
            )}
          </legend>
          {sentences.map((sentence) => (
            <label key={sentence.id} className={styles.check}>
              <input
                type="checkbox"
                checked={!excludedSentences.has(sentence.id)}
                aria-label={t('editor.practice.includeSentence', { text: sentence.italian })}
                onChange={(event) => {
                  onChange(
                    setPracticeExcluded(draft, 'sentence', sentence.id, !event.target.checked),
                  );
                }}
              />
              <span>
                <span lang="it" className={ui.serif}>
                  {sentence.italian}
                </span>
                <span className={`${ui.muted ?? ''} ${styles.czech ?? ''}`}>{sentence.czech}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.subtitle}>
            {t('editor.practice.words')}
            {excludedWords.size > 0 && (
              <span className={`${ui.chip ?? ''} ${ui.statusDraft ?? ''}`}>
                {t('editor.practice.excludedCount', { count: excludedWords.size })}
              </span>
            )}
          </legend>
          <div className={styles.words}>
            {draft.lexemes.map((lexeme) => (
              <label key={lexeme.id} className={styles.check}>
                <input
                  type="checkbox"
                  checked={!excludedWords.has(lexeme.id)}
                  aria-label={t('editor.practice.includeWord', { text: lexeme.lemma })}
                  onChange={(event) => {
                    onChange(
                      setPracticeExcluded(draft, 'lexeme', lexeme.id, !event.target.checked),
                    );
                  }}
                />
                <span>
                  <span lang="it" className={ui.serif}>
                    {lexeme.lemma}
                  </span>
                  <span className={`${ui.muted ?? ''} ${styles.czech ?? ''}`}>
                    {lexeme.translation}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>
    </div>
  );
}

function Options({ options, answer }: { options: readonly string[]; answer: string }) {
  return (
    <ul className={styles.options}>
      {options.map((option) => (
        <li
          key={option}
          className={`${ui.chip ?? ''} ${option === answer ? (ui.statusPublished ?? '') : (ui.chipOutlined ?? '')}`}>
          {option === answer && <Icon name="check" size={16} />}
          {option}
        </li>
      ))}
    </ul>
  );
}

/** One generated exercise as text: what the student sees and the right answer. */
function ExercisePreview({ exercise }: { exercise: Exercise }) {
  switch (exercise.type) {
    case 'choice':
      return (
        <>
          {exercise.context !== null && (
            <p>
              <span className={ui.muted}>{exercise.context.speaker}: </span>
              <span lang="it" className={ui.serif}>
                {exercise.context.italian}
              </span>
            </p>
          )}
          {exercise.prompt === null && exercise.context === null && exercise.audio !== null && (
            <p className={styles.audio}>
              <Icon name="headphones" size={18} />
              {t('editor.practice.audio', { text: exercise.audio })}
            </p>
          )}
          {exercise.prompt !== null && (
            <p
              lang={exercise.prompt.language}
              className={exercise.prompt.language === 'it' ? ui.serif : undefined}>
              {exercise.prompt.text}
            </p>
          )}
          <Options options={exercise.options} answer={exercise.answer} />
        </>
      );
    case 'fill_in_blank':
      return (
        <>
          <p lang="it" className={ui.serif}>
            {exercise.before}
            <span className={styles.blank}>_____</span>
            {exercise.after}
          </p>
          <p className={ui.muted}>{exercise.czech}</p>
          <Options options={exercise.options} answer={exercise.answer} />
        </>
      );
    case 'build': {
      const extra = exercise.tiles.filter((tile) => !exercise.answer.includes(tile));
      return (
        <>
          <p>{exercise.czech}</p>
          <p className={styles.answer}>
            {t('editor.practice.answer', { text: exercise.answer.join(' · ') })}
          </p>
          {extra.length > 0 && (
            <p className={ui.muted}>{t('editor.practice.tiles', { text: extra.join(' · ') })}</p>
          )}
        </>
      );
    }
  }
}
