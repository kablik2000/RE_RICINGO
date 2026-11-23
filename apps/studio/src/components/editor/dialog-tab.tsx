'use client';

import type { LessonBundle, Segment } from '@ricingo/domain';
import { listSentencesInOrder } from '@ricingo/domain';
import { useState } from 'react';

import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import {
  addSegment,
  addSentence,
  addTurn,
  removeSegment,
  removeSentence,
  removeTurn,
  setTurnSpeaker,
  updateSegment,
  updateSentence,
} from '@/lib/lesson-draft';

import styles from './editor.module.css';
import { PhonePreview } from './phone-preview';
import { SegmentEditor } from './segment-editor';

interface DialogTabProps {
  draft: LessonBundle;
  onChange: (draft: LessonBundle) => void;
  selectedSentenceId: string | undefined;
  onSelectSentence: (id: string | undefined) => void;
  hasIssues: boolean;
}

export function DialogTab({
  draft,
  onChange,
  selectedSentenceId,
  onSelectSentence,
  hasIssues,
}: DialogTabProps) {
  const sentences = listSentencesInOrder(draft.lesson);
  const current = sentences.find((item) => item.sentence.id === selectedSentenceId);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | undefined>();
  const [newSegment, setNewSegment] = useState('');
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const speakers = new Map(draft.lesson.speakers.map((speaker) => [speaker.id, speaker.label]));

  const segment: Segment | undefined =
    current?.sentence.segments.find((candidate) => candidate.id === selectedSegmentId) ??
    current?.sentence.segments[0];

  const selectSentence = (id: string | undefined) => {
    onSelectSentence(id);
    setSelectedSegmentId(undefined);
    setSegmentError(null);
  };

  return (
    <div className={styles.dialogLayout}>
      <section
        className={`${ui.cardTonal ?? ''} ${styles.tree ?? ''}`}
        aria-labelledby="tree-title">
        <div className={styles.treeHeader}>
          <h2 id="tree-title" className={styles.sectionTitle}>
            {t('editor.tree.title')}
          </h2>
          <button
            type="button"
            className={ui.iconButton}
            aria-label={t('editor.tree.addTurn')}
            title={t('editor.tree.addTurn')}
            onClick={() => {
              const result = addTurn(draft);
              onChange(result.bundle);
              selectSentence(result.sentenceId);
            }}>
            <Icon name="add_comment" />
          </button>
        </div>
        {draft.lesson.turns.length === 0 && <p className={ui.muted}>{t('editor.tree.empty')}</p>}
        <ol className={styles.turns}>
          {draft.lesson.turns.map((turn, turnIndex) => (
            <li key={turn.id}>
              <div className={styles.turnLabel}>
                <Icon name="person" size={16} />
                {t('editor.tree.turnLabel', {
                  number: turnIndex + 1,
                  speaker: speakers.get(turn.speakerId) ?? turn.speakerId,
                })}
                <span className={styles.spacer} />
                <button
                  type="button"
                  className={styles.treeAction}
                  aria-label={`${t('editor.tree.addSentence')} (${String(turnIndex + 1)})`}
                  title={t('editor.tree.addSentence')}
                  onClick={() => {
                    const result = addSentence(draft, turn.id);
                    onChange(result.bundle);
                    selectSentence(result.sentenceId);
                  }}>
                  <Icon name="add" size={18} />
                </button>
                <button
                  type="button"
                  className={styles.treeAction}
                  aria-label={`${t('editor.tree.removeTurn')} (${String(turnIndex + 1)})`}
                  title={t('editor.tree.removeTurn')}
                  onClick={() => {
                    onChange(removeTurn(draft, turn.id));
                    if (turn.sentences.some((item) => item.id === selectedSentenceId)) {
                      selectSentence(undefined);
                    }
                  }}>
                  <Icon name="delete" size={18} />
                </button>
              </div>
              <ul className={styles.sentences}>
                {turn.sentences.map((sentence) => (
                  <li key={sentence.id}>
                    <button
                      type="button"
                      lang="it"
                      className={styles.sentenceItem}
                      aria-current={sentence.id === selectedSentenceId ? 'true' : undefined}
                      onClick={() => {
                        selectSentence(sentence.id);
                      }}>
                      {sentence.italian.trim() === ''
                        ? t('editor.tree.emptySentence')
                        : sentence.italian}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.center} aria-label={t('editor.tabs.dialog')}>
        {current === undefined ? (
          <div className={`${ui.card ?? ''} ${styles.cardPadding ?? ''}`}>
            <p className={ui.muted}>{t('editor.sentence.none')}</p>
          </div>
        ) : (
          <>
            <div className={`${ui.card ?? ''} ${styles.cardPadding ?? ''} ${styles.stack ?? ''}`}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.sectionTitle}>
                  {t('editor.sentence.heading', {
                    number: current.index + 1,
                    total: sentences.length,
                    speaker: current.speaker.label,
                  })}
                </h2>
                <label className={styles.inlineField}>
                  {t('editor.sentence.speaker')}
                  <select
                    className={ui.select}
                    value={current.turn.speakerId}
                    onChange={(event) => {
                      onChange(setTurnSpeaker(draft, current.turn.id, event.target.value));
                    }}>
                    {draft.lesson.speakers.map((speaker) => (
                      <option key={speaker.id} value={speaker.id}>
                        {speaker.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={ui.iconButton}
                  aria-label={t('editor.sentence.remove')}
                  title={t('editor.sentence.remove')}
                  onClick={() => {
                    onChange(removeSentence(draft, current.sentence.id));
                    selectSentence(undefined);
                  }}>
                  <Icon name="delete" />
                </button>
              </div>
              <label className={ui.field}>
                {t('editor.sentence.italian')}
                <input
                  lang="it"
                  className={`${ui.input ?? ''} ${ui.serif ?? ''} ${styles.italianInput ?? ''}`}
                  value={current.sentence.italian}
                  onChange={(event) => {
                    onChange(
                      updateSentence(draft, current.sentence.id, { italian: event.target.value }),
                    );
                  }}
                />
              </label>
              <label className={ui.field}>
                {t('editor.sentence.czech')}
                <input
                  className={`${ui.input ?? ''} ${ui.serif ?? ''} ${styles.czechInput ?? ''}`}
                  value={current.sentence.czech}
                  onChange={(event) => {
                    onChange(
                      updateSentence(draft, current.sentence.id, { czech: event.target.value }),
                    );
                  }}
                />
              </label>

              <div className={styles.stackTight}>
                <span className={styles.label}>{t('editor.sentence.segments')}</span>
                <div className={styles.segmentRow} lang="it">
                  {current.sentence.segments.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.segmentChip}
                      aria-pressed={item.id === segment?.id}
                      onClick={() => {
                        setSelectedSegmentId(item.id);
                      }}>
                      {item.text}
                    </button>
                  ))}
                </div>
                <form
                  className={styles.addSegment}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const result = addSegment(draft, current.sentence.id, newSegment);
                    if (result === null) {
                      setSegmentError(
                        t('editor.sentence.segmentNotInSentence', { text: newSegment }),
                      );
                      return;
                    }
                    onChange(result.bundle);
                    setSelectedSegmentId(result.segmentId);
                    setNewSegment('');
                    setSegmentError(null);
                  }}>
                  <label className={ui.visuallyHidden} htmlFor="new-segment">
                    {t('editor.sentence.newSegment')}
                  </label>
                  <input
                    id="new-segment"
                    lang="it"
                    className={`${ui.input ?? ''} ${ui.serif ?? ''}`}
                    placeholder={t('editor.sentence.newSegment')}
                    value={newSegment}
                    onChange={(event) => {
                      setNewSegment(event.target.value);
                    }}
                  />
                  <button type="submit" className={`${ui.button ?? ''} ${ui.tonal ?? ''}`}>
                    <Icon name="add" size={18} />
                    {t('editor.sentence.addSegment')}
                  </button>
                </form>
                <span className={styles.hint} role={segmentError === null ? undefined : 'alert'}>
                  {segmentError ?? t('editor.sentence.segmentsHint')}
                </span>
              </div>
            </div>

            {segment === undefined ? (
              <div className={`${ui.card ?? ''} ${styles.cardPadding ?? ''}`}>
                <p className={ui.muted}>{t('editor.segment.none')}</p>
              </div>
            ) : (
              <SegmentEditor
                key={segment.id}
                draft={draft}
                segment={segment}
                position={current.sentence.segments.indexOf(segment) + 1}
                total={current.sentence.segments.length}
                onChange={(changes) => {
                  onChange(updateSegment(draft, current.sentence.id, segment.id, changes));
                }}
                onRemove={() => {
                  onChange(removeSegment(draft, current.sentence.id, segment.id));
                  setSelectedSegmentId(undefined);
                }}
              />
            )}
          </>
        )}
      </section>

      <PhonePreview
        draft={draft}
        sentenceId={current?.sentence.id}
        segmentId={segment?.id}
        hasIssues={hasIssues}
      />
    </div>
  );
}
