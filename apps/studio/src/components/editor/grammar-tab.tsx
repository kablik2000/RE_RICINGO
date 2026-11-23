'use client';

import type { LessonBundle } from '@ricingo/domain';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { addGrammarTopic, removeGrammarTopic, updateGrammarTopic } from '@/lib/lesson-draft';

import styles from './editor.module.css';

/** Grammar topics of the lesson (shown on the lesson intro and linked from segments). */
export function GrammarTab({
  draft,
  onChange,
}: {
  draft: LessonBundle;
  onChange: (draft: LessonBundle) => void;
}) {
  return (
    <section className={styles.cardList}>
      {draft.grammarTopics.length === 0 && <p className={ui.muted}>{t('editor.grammar.empty')}</p>}
      {draft.grammarTopics.map((topic) => (
        <div
          key={topic.id}
          className={`${ui.card ?? ''} ${styles.cardPadding ?? ''} ${styles.topicCard ?? ''}`}>
          <div className={styles.stack}>
            <label className={ui.field}>
              {t('editor.grammar.title')}
              <input
                className={ui.input}
                value={topic.title}
                onChange={(event) => {
                  onChange(updateGrammarTopic(draft, topic.id, { title: event.target.value }));
                }}
              />
            </label>
            <label className={ui.field}>
              {t('editor.grammar.summary')}
              <textarea
                className={ui.textarea}
                rows={2}
                value={topic.summary}
                onChange={(event) => {
                  onChange(updateGrammarTopic(draft, topic.id, { summary: event.target.value }));
                }}
              />
            </label>
          </div>
          <button
            type="button"
            className={ui.iconButton}
            aria-label={`${t('editor.grammar.remove')}: ${topic.title}`}
            onClick={() => {
              onChange(removeGrammarTopic(draft, topic.id));
            }}>
            <Icon name="delete" />
          </button>
        </div>
      ))}
      <div>
        <button
          type="button"
          className={`${ui.button ?? ''} ${ui.tonal ?? ''}`}
          onClick={() => {
            onChange(addGrammarTopic(draft).bundle);
          }}>
          <Icon name="add" size={18} />
          {t('editor.grammar.add')}
        </button>
      </div>
    </section>
  );
}
