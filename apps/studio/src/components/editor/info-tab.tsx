'use client';

import { cefrLevelSchema, type LessonBundle, lessonThemeSchema } from '@ricingo/domain';

import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { renameSpeaker, setLessonTheme, updateLessonInfo } from '@/lib/lesson-draft';

import styles from './editor.module.css';

/** Lesson title, level, goal and speaker names. */
export function InfoTab({
  draft,
  onChange,
}: {
  draft: LessonBundle;
  onChange: (draft: LessonBundle) => void;
}) {
  const { lesson } = draft;
  return (
    <section
      className={`${ui.card ?? ''} ${styles.cardPadding ?? ''} ${styles.stack ?? ''} ${styles.infoCard ?? ''}`}>
      <div className={styles.twoFields}>
        <label className={ui.field}>
          {t('editor.info.titleItalian')}
          <input
            lang="it"
            className={`${ui.input ?? ''} ${ui.serif ?? ''}`}
            value={lesson.titleItalian}
            onChange={(event) => {
              onChange(updateLessonInfo(draft, { titleItalian: event.target.value }));
            }}
          />
        </label>
        <label className={ui.field}>
          {t('editor.info.titleCzech')}
          <input
            className={ui.input}
            value={lesson.titleCzech}
            onChange={(event) => {
              onChange(updateLessonInfo(draft, { titleCzech: event.target.value }));
            }}
          />
        </label>
      </div>
      <label className={ui.field}>
        {t('editor.info.level')}
        <select
          className={ui.select}
          value={lesson.level}
          onChange={(event) => {
            const level = cefrLevelSchema.safeParse(event.target.value);
            if (level.success) onChange(updateLessonInfo(draft, { level: level.data }));
          }}>
          {cefrLevelSchema.options.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </label>
      <label className={ui.field}>
        {t('editor.info.theme')}
        <select
          className={ui.select}
          value={lesson.theme ?? ''}
          onChange={(event) => {
            const theme = lessonThemeSchema.safeParse(event.target.value);
            onChange(setLessonTheme(draft, theme.success ? theme.data : null));
          }}>
          <option value="">{t('editor.info.noTheme')}</option>
          {lessonThemeSchema.options.map((theme) => (
            <option key={theme} value={theme}>
              {t(`themes.${theme}`)}
            </option>
          ))}
        </select>
        <span className={styles.hint}>{t('editor.info.themeHint')}</span>
      </label>
      <label className={ui.field}>
        {t('editor.info.goal')}
        <textarea
          className={ui.textarea}
          rows={2}
          value={lesson.goal}
          onChange={(event) => {
            onChange(updateLessonInfo(draft, { goal: event.target.value }));
          }}
        />
      </label>
      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>{t('editor.info.speakers')}</legend>
        <div className={styles.twoFields}>
          {lesson.speakers.map((speaker, index) => (
            <label key={speaker.id} className={ui.field}>
              {t('editor.info.speakerLabel', { number: index + 1 })}
              <input
                className={ui.input}
                value={speaker.label}
                onChange={(event) => {
                  onChange(renameSpeaker(draft, speaker.id, event.target.value));
                }}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
