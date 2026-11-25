'use client';

import { useActionState, useState } from 'react';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import type { LessonOption, RecommendationKind } from '@/lib/studio-api';

import { recommendAction, type RecommendState } from './actions';
import styles from './student.module.css';

const KINDS: readonly RecommendationKind[] = ['lesson', 'practice', 'vocabulary'];

/** Recommends a lesson, practice or words of a lesson to one student (ADR-0013 step 4). */
export function RecommendForm({
  studentId,
  lessons,
}: {
  studentId: string;
  lessons: LessonOption[];
}) {
  const [state, formAction, pending] = useActionState<RecommendState, FormData>(
    recommendAction.bind(null, studentId),
    { saved: 0 },
  );
  // A new key after each saved recommendation starts the fields over.
  return (
    <RecommendFields
      key={state.saved}
      lessons={lessons}
      state={state}
      formAction={formAction}
      pending={pending}
    />
  );
}

function RecommendFields({
  lessons,
  state,
  formAction,
  pending,
}: {
  lessons: LessonOption[];
  state: RecommendState;
  formAction: (form: FormData) => void;
  pending: boolean;
}) {
  const [kind, setKind] = useState<RecommendationKind>('lesson');
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '');
  const lesson = lessons.find((option) => option.id === lessonId);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(
    () => new Set(lessons[0]?.words.map((word) => word.id)),
  );

  const chooseLesson = (id: string) => {
    setLessonId(id);
    setChosen(new Set(lessons.find((option) => option.id === id)?.words.map((word) => word.id)));
  };
  const toggleWord = (id: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(id);
    else next.delete(id);
    setChosen(next);
  };

  return (
    <form action={formAction} className={`${ui.card ?? ''} ${styles.form ?? ''}`}>
      <fieldset className={styles.kinds}>
        <legend className={styles.label}>{t('student.form.kind')}</legend>
        {KINDS.map((option) => (
          <label
            key={option}
            className={`${ui.filterChip ?? ''} ${option === kind ? (ui.filterChipSelected ?? '') : ''}`}>
            <input
              type="radio"
              name="kind"
              value={option}
              checked={option === kind}
              className={ui.visuallyHidden}
              onChange={() => {
                setKind(option);
              }}
            />
            {option === kind && <Icon name="check" size={18} />}
            {t(`student.kinds.${option}`)}
          </label>
        ))}
        <p className={`${ui.muted ?? ''} ${styles.hint ?? ''}`}>{t(`student.kindHints.${kind}`)}</p>
      </fieldset>

      <label className={ui.field}>
        <span>{t('student.form.lesson')}</span>
        <select
          className={ui.select}
          name="lessonId"
          value={lessonId}
          onChange={(event) => {
            chooseLesson(event.target.value);
          }}>
          {lessons.map((option) => (
            <option key={option.id} value={option.id}>
              {option.titleItalian} · {option.titleCzech} ({option.level})
              {option.visibility === 'students' ? ` · ${t('student.form.studentsOnly')}` : ''}
            </option>
          ))}
        </select>
      </label>

      {kind === 'practice' && lesson !== undefined && (
        <label className={ui.field}>
          <span>{t('student.form.topic')}</span>
          <select className={ui.select} name="grammarTopicId" defaultValue="">
            <option value="">{t('student.form.wholeLesson')}</option>
            {lesson.grammarTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === 'vocabulary' && lesson !== undefined && (
        <fieldset className={styles.words}>
          <legend className={styles.label}>
            {t('student.form.words', { count: chosen.size, total: lesson.words.length })}
          </legend>
          <div className={ui.actions}>
            <button
              type="button"
              className={`${ui.button ?? ''} ${ui.text ?? ''}`}
              onClick={() => {
                setChosen(new Set(lesson.words.map((word) => word.id)));
              }}>
              {t('student.form.selectAll')}
            </button>
            <button
              type="button"
              className={`${ui.button ?? ''} ${ui.text ?? ''}`}
              onClick={() => {
                setChosen(new Set());
              }}>
              {t('student.form.selectNone')}
            </button>
          </div>
          <div className={styles.wordGrid}>
            {lesson.words.map((word) => (
              <label key={word.id} className={styles.word}>
                <input
                  type="checkbox"
                  name="wordIds"
                  value={word.id}
                  checked={chosen.has(word.id)}
                  onChange={(event) => {
                    toggleWord(word.id, event.target.checked);
                  }}
                />
                <span>
                  <span lang="it" className={styles.lemma}>
                    {word.lemma}
                  </span>{' '}
                  <span className={ui.muted}>{word.translation}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className={ui.field}>
        <span>{t('student.form.note')}</span>
        <textarea
          className={ui.textarea}
          name="note"
          rows={2}
          maxLength={500}
          placeholder={t('student.form.notePlaceholder')}
        />
      </label>

      {state.error !== undefined && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      {state.ok === true && (
        <p role="status" className={styles.done}>
          {t('student.form.done')}
        </p>
      )}
      <div className={ui.actions}>
        <button
          type="submit"
          className={`${ui.button ?? ''} ${ui.filled ?? ''}`}
          disabled={pending || (kind === 'vocabulary' && chosen.size === 0)}>
          <Icon name="recommend" size={18} />
          {pending ? t('student.form.submitting') : t('student.form.submit')}
        </button>
      </div>
    </form>
  );
}
