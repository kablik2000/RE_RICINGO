import Link from 'next/link';
import { connection } from 'next/server';

import { ApiStatusBadge } from '@/components/api-status-badge';
import { t, type TranslationKey } from '@/i18n';
import { apiBaseUrl, fetchApiStatus } from '@/lib/api-status';

import styles from './page.module.css';

const SECTIONS = ['lessons', 'students', 'results'] as const;

export default async function OverviewPage() {
  // Rendered per request: the backend status must be current.
  await connection();
  const status = await fetchApiStatus(apiBaseUrl());

  return (
    <div className={styles.shell}>
      <header className={styles.appBar}>
        <div className={styles.brand}>
          <span className={styles.brandName}>{t('app.name')}</span>
          <span className={styles.brandProduct}>{t('app.product')}</span>
        </div>
        <nav aria-label={t('app.product')}>
          <Link className={styles.navLink} href="/" aria-current="page">
            {t('nav.overview')}
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{t('overview.title')}</h1>
        <p className={styles.intro}>{t('overview.intro')}</p>

        <ul className={styles.sections}>
          {SECTIONS.map((section) => (
            <li key={section} className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  {t(`overview.sections.${section}.title` satisfies TranslationKey)}
                </h2>
                <span className={styles.chip}>
                  {t(`overview.sections.${section}.status` satisfies TranslationKey)}
                </span>
              </div>
              <p className={styles.sectionText}>
                {t(`overview.sections.${section}.description` satisfies TranslationKey)}
              </p>
            </li>
          ))}
        </ul>

        <ApiStatusBadge status={status} />
      </main>
    </div>
  );
}
