import { Icon } from '@/components/icon';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import type { DescribedIssue } from '@/lib/issues';

import styles from './editor.module.css';

/** Result of "Zkontrolovat": what blocks publishing, each item opening its place in the editor. */
export function IssuesPanel({
  issues,
  onClose,
  onOpen,
}: {
  issues: DescribedIssue[];
  onClose: () => void;
  onOpen: (issue: DescribedIssue) => void;
}) {
  const ok = issues.length === 0;
  return (
    <section className={styles.issues} data-ok={ok} aria-labelledby="issues-title">
      <div className={styles.issuesHeader}>
        <Icon name={ok ? 'check_circle' : 'error'} />
        <h2 id="issues-title" className={styles.issuesTitle}>
          {t('editor.issues.title')} —{' '}
          {ok ? t('editor.issues.ok') : t('editor.issues.count', { count: issues.length })}
        </h2>
        <button
          type="button"
          className={ui.iconButton}
          aria-label={t('editor.issues.close')}
          onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {!ok && (
        <ul className={styles.issueList}>
          {issues.map((issue, index) => (
            <li key={`${issue.location}-${String(index)}`}>
              <button
                type="button"
                className={styles.issue}
                onClick={() => {
                  onOpen(issue);
                }}>
                <span className={styles.issueLocation}>{issue.location}</span>
                <span>{issue.message}</span>
                <Icon name="chevron_right" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
