'use client';

import type { LessonBundle } from '@ricingo/domain';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';

import { publishAction, saveDraftAction } from '@/app/lessons/[id]/actions';
import { Icon } from '@/components/icon';
import { StatusChip } from '@/components/status-chip';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { describeIssue } from '@/lib/issues';
import type { LessonDetail, LessonIssue, LessonSummary } from '@/lib/studio-api';

import { DialogTab } from './dialog-tab';
import styles from './editor.module.css';
import { GrammarTab } from './grammar-tab';
import { InfoTab } from './info-tab';
import { IssuesPanel } from './issues-panel';
import { VocabularyTab } from './vocabulary-tab';

export type EditorTab = 'dialog' | 'vocabulary' | 'grammar' | 'info';
type SaveState = 'saved' | 'unsaved' | 'saving' | 'failed';

const AUTOSAVE_DELAY_MS = 800;

/** The lesson editor (approved Studio design, screen 3): autosaves every change. */
export function LessonEditor({ initial }: { initial: LessonDetail }) {
  const [draft, setDraft] = useState<LessonBundle>(initial.draft);
  const [summary, setSummary] = useState<LessonSummary>(initial.lesson);
  const [issues, setIssues] = useState<LessonIssue[]>(initial.issues);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [tab, setTab] = useState<EditorTab>('dialog');
  const [selectedSentenceId, setSelectedSentenceId] = useState<string | undefined>(
    initial.draft.lesson.turns[0]?.sentences[0]?.id,
  );
  const [showIssues, setShowIssues] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishing, startPublishing] = useTransition();
  // What the server has; a draft equal to it (initial load, after publishing) is not saved again.
  const lastSaved = useRef(JSON.stringify(initial.draft));

  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === lastSaved.current) {
      return;
    }
    setSaveState('unsaved');
    const timer = setTimeout(() => {
      setSaveState('saving');
      saveDraftAction(summary.id, draft)
        .then((result) => {
          if (result.ok) {
            lastSaved.current = serialized;
            setSummary(result.lesson);
            setIssues(result.issues);
            setSaveState('saved');
          } else {
            setSaveState('failed');
            setNotice(result.message);
          }
        })
        .catch((error: unknown) => {
          setSaveState('failed');
          setNotice(error instanceof Error ? error.message : String(error));
        });
    }, AUTOSAVE_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, summary.id]);

  const nextVersion = (summary.publishedVersion ?? 0) + 1;
  const canPublish =
    saveState === 'saved' && issues.length === 0 && summary.status !== 'published' && !publishing;

  const publish = () => {
    startPublishing(async () => {
      const result = await publishAction(summary.id);
      if (result.ok) {
        lastSaved.current = JSON.stringify(result.detail.draft);
        setDraft(result.detail.draft);
        setSummary(result.detail.lesson);
        setIssues(result.detail.issues);
        setNotice(t('editor.published', { version: result.detail.lesson.publishedVersion ?? 0 }));
      } else {
        setIssues(result.issues.length > 0 ? result.issues : issues);
        setShowIssues(true);
        setNotice(t('editor.publishFailed', { message: result.message }));
      }
    });
  };

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'dialog', label: t('editor.tabs.dialog') },
    { id: 'vocabulary', label: t('editor.tabs.vocabulary', { count: draft.lexemes.length }) },
    { id: 'grammar', label: t('editor.tabs.grammar', { count: draft.grammarTopics.length }) },
    { id: 'info', label: t('editor.tabs.info') },
  ];

  return (
    <main className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <Link href="/lessons" className={ui.iconButton} aria-label={t('editor.backToLessons')}>
            <Icon name="arrow_back" />
          </Link>
          <div className={styles.titleBlock}>
            <span className={ui.muted}>
              {t('editor.breadcrumb', {
                level: draft.lesson.level,
                czech: draft.lesson.titleCzech,
              })}
            </span>
            <h1 className={`${ui.serif ?? ''} ${styles.title ?? ''}`} lang="it">
              {draft.lesson.titleItalian}
            </h1>
          </div>
          <StatusChip status={summary.status} version={summary.publishedVersion} />
          <span className={styles.spacer} />
          <span className={styles.saveState} role="status" data-state={saveState}>
            <Icon
              name={
                saveState === 'failed'
                  ? 'cloud_off'
                  : saveState === 'saved'
                    ? 'cloud_done'
                    : 'cloud_sync'
              }
              size={18}
            />
            {t(`editor.save.${saveState}`)}
          </span>
          <button
            type="button"
            className={`${ui.button ?? ''} ${ui.outlined ?? ''}`}
            onClick={() => {
              setShowIssues((value) => !value);
            }}
            aria-expanded={showIssues}>
            <Icon name="fact_check" size={18} />
            {t('editor.check')}
          </button>
          <button
            type="button"
            className={`${ui.button ?? ''} ${ui.filled ?? ''}`}
            disabled={!canPublish}
            onClick={publish}>
            <Icon name="publish" size={18} />
            {publishing ? t('editor.publishing') : t('editor.publish', { version: nextVersion })}
          </button>
        </div>
        <div role="tablist" aria-label={t('editor.tabs.label')} className={styles.tabs}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              className={styles.tab}
              onClick={() => {
                setTab(item.id);
              }}>
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {notice !== null && (
        <p className={styles.notice} role="status">
          {notice}
          <button
            type="button"
            className={ui.iconButton}
            aria-label={t('editor.issues.close')}
            onClick={() => {
              setNotice(null);
            }}>
            <Icon name="close" size={18} />
          </button>
        </p>
      )}

      {showIssues && (
        <IssuesPanel
          issues={issues.map((issue) => describeIssue(issue, draft))}
          onClose={() => {
            setShowIssues(false);
          }}
          onOpen={(target) => {
            setTab(target.tab);
            if (target.sentenceId !== undefined) setSelectedSentenceId(target.sentenceId);
          }}
        />
      )}

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className={styles.panel}>
        {tab === 'dialog' && (
          <DialogTab
            draft={draft}
            onChange={setDraft}
            selectedSentenceId={selectedSentenceId}
            onSelectSentence={setSelectedSentenceId}
            hasIssues={issues.length > 0}
          />
        )}
        {tab === 'vocabulary' && <VocabularyTab draft={draft} onChange={setDraft} />}
        {tab === 'grammar' && <GrammarTab draft={draft} onChange={setDraft} />}
        {tab === 'info' && <InfoTab draft={draft} onChange={setDraft} />}
      </div>
    </main>
  );
}
