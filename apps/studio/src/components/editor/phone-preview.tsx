import type { LessonBundle } from '@ricingo/domain';
import { listSentencesInOrder, splitSentenceIntoPieces } from '@ricingo/domain';

import { Icon } from '@/components/icon';
import { t } from '@/i18n';

import styles from './editor.module.css';

/**
 * Live preview of the student app's sentence-study screen (approved app design v1) for the
 * selected sentence and segment. A visual approximation on the web; the app is the reference.
 */
export function PhonePreview({
  draft,
  sentenceId,
  segmentId,
  hasIssues,
}: {
  draft: LessonBundle;
  sentenceId: string | undefined;
  segmentId: string | undefined;
  hasIssues: boolean;
}) {
  const sentences = listSentencesInOrder(draft.lesson);
  const current = sentences.find((item) => item.sentence.id === sentenceId);
  const segment = current?.sentence.segments.find((item) => item.id === segmentId);
  const features = segment?.annotation?.split(' · ') ?? [];

  return (
    <aside className={styles.previewColumn} aria-labelledby="preview-title">
      <div className={styles.previewHeader}>
        <h2 id="preview-title" className={styles.sectionTitle}>
          {t('editor.preview.title')}
        </h2>
        <span className={styles.previewState} data-ok={!hasIssues}>
          <Icon name={hasIssues ? 'error' : 'check_circle'} size={16} />
          {hasIssues ? t('editor.preview.issues') : t('editor.preview.ok')}
        </span>
      </div>
      <div className={styles.phone}>
        {current === undefined ? (
          <p className={styles.phoneEmpty}>{t('editor.preview.empty')}</p>
        ) : (
          <>
            <div className={styles.phoneProgress}>
              <span lang="it">{draft.lesson.titleItalian}</span>
              <span>
                {t('editor.preview.progress', {
                  current: current.index + 1,
                  total: sentences.length,
                })}
              </span>
            </div>
            <div className={styles.phoneBar}>
              <div
                style={{ width: `${String(((current.index + 1) / sentences.length) * 100)}%` }}
              />
            </div>
            <div className={styles.phoneCard}>
              <span className={styles.phoneSpeaker}>{current.speaker.label}</span>
              <p className={styles.phoneSentence} lang="it">
                {splitSentenceIntoPieces(current.sentence).map((piece, index) =>
                  piece.kind === 'gap' ? (
                    <span key={index}>{piece.text}</span>
                  ) : (
                    <span
                      key={index}
                      className={
                        piece.segment.id === segmentId ? styles.phoneSelected : styles.phoneSegment
                      }>
                      {piece.text}
                    </span>
                  ),
                )}
              </p>
              <p className={styles.phoneTranslation}>{current.sentence.czech}</p>
              <div className={styles.phoneListen}>
                <span className={styles.phonePlay}>
                  <Icon name="volume_up" size={18} filled />
                </span>
                <span className={styles.phoneSlow}>{t('editor.preview.slow')}</span>
              </div>
            </div>
            {segment !== undefined && (
              <div className={styles.phoneAnalysis}>
                <div className={styles.phoneAnalysisTitle}>
                  <span lang="it">{segment.text}</span>
                  <span>{segment.explanation.meaning}</span>
                </div>
                {features.length > 0 && (
                  <div className={styles.phoneTags}>
                    {features.map((feature) => (
                      <span key={feature}>{feature}</span>
                    ))}
                  </div>
                )}
                {segment.explanation.grammar !== undefined && (
                  <p className={styles.phoneGrammar}>{segment.explanation.grammar}</p>
                )}
                {segment.explanation.depth !== undefined && (
                  <span className={styles.phoneDepth}>
                    {t('editor.preview.depth')}
                    <Icon name="expand_more" size={14} />
                  </span>
                )}
              </div>
            )}
            <span className={styles.spacer} />
            <div className={styles.phoneNav}>
              <span>{t('editor.preview.previous')}</span>
              <span>{t('editor.preview.next')}</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
