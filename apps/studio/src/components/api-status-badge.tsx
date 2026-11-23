import { t } from '@/i18n';
import type { ApiStatus } from '@/lib/api-status';

import styles from './api-status-badge.module.css';

const MESSAGE_KEYS = {
  online: 'apiStatus.online',
  degraded: 'apiStatus.degraded',
  offline: 'apiStatus.offline',
} as const;

/** Backend connection state, shown so the lecturer knows whether saving will work. */
export function ApiStatusBadge({ status }: { status: ApiStatus }) {
  return (
    <section className={styles.panel} aria-labelledby="api-status-title">
      <h2 id="api-status-title" className={styles.title}>
        {t('apiStatus.title')}
      </h2>
      <p className={styles.row} role="status" data-status={status.kind}>
        <span className={styles.dot} aria-hidden="true" />
        {t(MESSAGE_KEYS[status.kind])}
      </p>
    </section>
  );
}
