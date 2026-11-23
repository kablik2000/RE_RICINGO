'use client';

import type { LessonBundle, Segment } from '@ricingo/domain';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import type { SegmentChanges } from '@/lib/lesson-draft';

import styles from './editor.module.css';

/** Layered explanation of one sentence segment (spec §3): meaning, grammar, deeper context. */
export function SegmentEditor({
  draft,
  segment,
  position,
  total,
  onChange,
  onRemove,
}: {
  draft: LessonBundle;
  segment: Segment;
  position: number;
  total: number;
  onChange: (changes: SegmentChanges) => void;
  onRemove: () => void;
}) {
  const lexemes = new Map(draft.lexemes.map((lexeme) => [lexeme.id, lexeme]));
  const topics = new Map(draft.grammarTopics.map((topic) => [topic.id, topic]));
  const availableLexemes = draft.lexemes.filter((lexeme) => !segment.lexemeIds.includes(lexeme.id));
  const availableTopics = draft.grammarTopics.filter(
    (topic) => !segment.grammarTopicIds.includes(topic.id),
  );

  return (
    <div className={`${ui.card ?? ''} ${styles.cardPadding ?? ''} ${styles.stack ?? ''}`}>
      <div className={styles.cardHeaderRow}>
        <h3 className={`${ui.serif ?? ''} ${styles.segmentTitle ?? ''}`} lang="it">
          {segment.text}
        </h3>
        <span className={ui.muted}>
          {t('editor.segment.position', { number: position, total })}
        </span>
        <span className={styles.spacer} />
        <button
          type="button"
          className={ui.iconButton}
          aria-label={t('editor.segment.remove')}
          title={t('editor.segment.remove')}
          onClick={onRemove}>
          <Icon name="delete" />
        </button>
      </div>

      <div className={styles.twoFields}>
        <label className={ui.field}>
          {t('editor.segment.meaning')}
          <input
            className={ui.input}
            value={segment.explanation.meaning}
            onChange={(event) => {
              onChange({ meaning: event.target.value });
            }}
          />
        </label>
        <label className={ui.field}>
          {t('editor.segment.annotation')}
          <input
            className={ui.input}
            placeholder={t('editor.segment.annotationHint')}
            value={segment.annotation ?? ''}
            onChange={(event) => {
              onChange({ annotation: event.target.value });
            }}
          />
        </label>
      </div>
      <label className={ui.field}>
        {t('editor.segment.grammar')}
        <textarea
          className={ui.textarea}
          rows={2}
          value={segment.explanation.grammar ?? ''}
          onChange={(event) => {
            onChange({ grammar: event.target.value });
          }}
        />
      </label>
      <label className={ui.field}>
        {t('editor.segment.depth')}
        <textarea
          className={ui.textarea}
          rows={2}
          value={segment.explanation.depth ?? ''}
          onChange={(event) => {
            onChange({ depth: event.target.value });
          }}
        />
      </label>

      <div className={styles.twoFields}>
        <div className={styles.stackTight}>
          <span className={styles.label}>{t('editor.segment.lexemes')}</span>
          <div className={styles.linkRow}>
            {segment.lexemeIds.map((id) => (
              <span key={id} className={styles.linkChip}>
                {lexemes.get(id)?.lemma ?? id}
                {lexemes.get(id) !== undefined && ` · ${lexemes.get(id)?.translation ?? ''}`}
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`${t('common.remove')}: ${lexemes.get(id)?.lemma ?? id}`}
                  onClick={() => {
                    onChange({ lexemeIds: segment.lexemeIds.filter((item) => item !== id) });
                  }}>
                  <Icon name="close" size={16} />
                </button>
              </span>
            ))}
            {availableLexemes.length > 0 && (
              <select
                className={`${ui.select ?? ''} ${styles.addSelect ?? ''}`}
                aria-label={t('editor.segment.pickLexeme')}
                value=""
                onChange={(event) => {
                  if (event.target.value !== '') {
                    onChange({ lexemeIds: [...segment.lexemeIds, event.target.value] });
                  }
                }}>
                <option value="">{t('editor.segment.pickLexeme')}</option>
                {availableLexemes.map((lexeme) => (
                  <option key={lexeme.id} value={lexeme.id}>
                    {lexeme.lemma === '' ? lexeme.id : `${lexeme.lemma} · ${lexeme.translation}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className={styles.stackTight}>
          <span className={styles.label}>{t('editor.segment.topics')}</span>
          <div className={styles.linkRow}>
            {segment.grammarTopicIds.map((id) => (
              <span key={id} className={styles.linkChip}>
                {topics.get(id)?.title ?? id}
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`${t('common.remove')}: ${topics.get(id)?.title ?? id}`}
                  onClick={() => {
                    onChange({
                      grammarTopicIds: segment.grammarTopicIds.filter((item) => item !== id),
                    });
                  }}>
                  <Icon name="close" size={16} />
                </button>
              </span>
            ))}
            {availableTopics.length > 0 && (
              <select
                className={`${ui.select ?? ''} ${styles.addSelect ?? ''}`}
                aria-label={t('editor.segment.pickTopic')}
                value=""
                onChange={(event) => {
                  if (event.target.value !== '') {
                    onChange({ grammarTopicIds: [...segment.grammarTopicIds, event.target.value] });
                  }
                }}>
                <option value="">{t('editor.segment.pickTopic')}</option>
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title === '' ? topic.id : topic.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
