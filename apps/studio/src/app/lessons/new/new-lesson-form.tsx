'use client';

import { useActionState } from 'react';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';

import { createLessonAction, type CreateLessonState } from './actions';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export function NewLessonForm() {
  const [state, action, pending] = useActionState<CreateLessonState, FormData>(
    createLessonAction,
    {},
  );
  return (
    <form
      action={action}
      className={ui.card}
      style={{
        padding: 'var(--rici-space-xl)',
        display: 'grid',
        gap: 'var(--rici-space-lg)',
        maxWidth: 640,
      }}>
      <label className={ui.field}>
        {t('newLesson.titleItalian')}
        <input
          name="titleItalian"
          required
          placeholder={t('newLesson.titleItalianHint')}
          className={`${ui.input ?? ''} ${ui.serif ?? ''}`}
          lang="it"
        />
      </label>
      <label className={ui.field}>
        {t('newLesson.titleCzech')}
        <input name="titleCzech" placeholder={t('newLesson.titleCzechHint')} className={ui.input} />
      </label>
      <label className={ui.field}>
        {t('newLesson.level')}
        <select name="level" defaultValue="A1" className={ui.select}>
          {LEVELS.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </label>
      {state.error !== undefined && (
        <p role="alert" style={{ margin: 0, color: 'var(--rici-color-error)' }}>
          {state.error}
        </p>
      )}
      <div>
        <button
          type="submit"
          className={`${ui.button ?? ''} ${ui.filled ?? ''}`}
          disabled={pending}>
          <Icon name="edit_note" size={18} />
          {t('newLesson.submit')}
        </button>
      </div>
    </form>
  );
}
