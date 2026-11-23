import { Icon } from '@/components/icon';
import { t } from '@/i18n';

import ui from './ui.module.css';

/** Shown instead of page content when the backend cannot be reached. */
export function ServerUnavailable({ detail }: { detail: string }) {
  return (
    <section
      className={ui.cardTonal}
      role="alert"
      style={{ padding: 'var(--rici-space-xl)', display: 'flex', gap: 'var(--rici-space-lg)' }}>
      <Icon name="cloud_off" size={32} />
      <div>
        <h2 className={ui.cardTitle}>{t('serverUnavailable.title')}</h2>
        <p className={ui.muted}>{t('serverUnavailable.message')}</p>
        <p className={ui.muted} style={{ fontSize: 'var(--rici-type-body-small-size)' }}>
          {detail}
        </p>
      </div>
    </section>
  );
}
