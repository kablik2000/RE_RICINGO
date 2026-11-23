'use client';

import { genderSchema, type LessonBundle, partOfSpeechSchema } from '@ricingo/domain';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { addLexeme, removeLexeme, updateLexeme } from '@/lib/lesson-draft';

import styles from './editor.module.css';

/** Lesson vocabulary: the lexemes segments link to (shown in the student's dictionary). */
export function VocabularyTab({
  draft,
  onChange,
}: {
  draft: LessonBundle;
  onChange: (draft: LessonBundle) => void;
}) {
  return (
    <section className={`${ui.card ?? ''} ${styles.tableCard ?? ''}`}>
      <table className={styles.editTable}>
        <thead>
          <tr>
            <th scope="col">{t('editor.vocabulary.lemma')}</th>
            <th scope="col">{t('editor.vocabulary.translation')}</th>
            <th scope="col">{t('editor.vocabulary.partOfSpeech')}</th>
            <th scope="col">{t('editor.vocabulary.gender')}</th>
            <th scope="col">{t('editor.vocabulary.note')}</th>
            <th scope="col">
              <span className={ui.visuallyHidden}>{t('editor.vocabulary.remove')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {draft.lexemes.map((lexeme) => (
            <tr key={lexeme.id}>
              <td>
                <input
                  lang="it"
                  aria-label={t('editor.vocabulary.lemma')}
                  className={`${ui.input ?? ''} ${ui.serif ?? ''}`}
                  value={lexeme.lemma}
                  onChange={(event) => {
                    onChange(updateLexeme(draft, lexeme.id, { lemma: event.target.value }));
                  }}
                />
              </td>
              <td>
                <input
                  aria-label={t('editor.vocabulary.translation')}
                  className={ui.input}
                  value={lexeme.translation}
                  onChange={(event) => {
                    onChange(updateLexeme(draft, lexeme.id, { translation: event.target.value }));
                  }}
                />
              </td>
              <td>
                <select
                  aria-label={t('editor.vocabulary.partOfSpeech')}
                  className={ui.select}
                  value={lexeme.partOfSpeech}
                  onChange={(event) => {
                    const value = partOfSpeechSchema.safeParse(event.target.value);
                    if (value.success)
                      onChange(updateLexeme(draft, lexeme.id, { partOfSpeech: value.data }));
                  }}>
                  {partOfSpeechSchema.options.map((option) => (
                    <option key={option} value={option}>
                      {t(`partOfSpeech.${option}`)}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  aria-label={t('editor.vocabulary.gender')}
                  className={ui.select}
                  value={lexeme.gender ?? ''}
                  onChange={(event) => {
                    const value = genderSchema.safeParse(event.target.value);
                    onChange(
                      updateLexeme(draft, lexeme.id, { gender: value.success ? value.data : null }),
                    );
                  }}>
                  <option value="">{t('editor.vocabulary.noGender')}</option>
                  {genderSchema.options.map((option) => (
                    <option key={option} value={option}>
                      {t(`gender.${option}`)}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  aria-label={t('editor.vocabulary.note')}
                  className={ui.input}
                  value={lexeme.note ?? ''}
                  onChange={(event) => {
                    onChange(updateLexeme(draft, lexeme.id, { note: event.target.value }));
                  }}
                />
              </td>
              <td>
                <button
                  type="button"
                  className={ui.iconButton}
                  aria-label={`${t('editor.vocabulary.remove')}: ${lexeme.lemma}`}
                  onClick={() => {
                    onChange(removeLexeme(draft, lexeme.id));
                  }}>
                  <Icon name="delete" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {draft.lexemes.length === 0 && (
        <p className={`${ui.muted ?? ''} ${styles.cardPadding ?? ''}`}>
          {t('editor.vocabulary.empty')}
        </p>
      )}
      <div className={styles.tableFooter}>
        <button
          type="button"
          className={`${ui.button ?? ''} ${ui.tonal ?? ''}`}
          onClick={() => {
            onChange(addLexeme(draft).bundle);
          }}>
          <Icon name="add" size={18} />
          {t('editor.vocabulary.add')}
        </button>
      </div>
    </section>
  );
}
