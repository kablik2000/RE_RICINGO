import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from '@/components/icon';
import { t, type TranslationKey } from '@/i18n';

import styles from './app-shell.module.css';

export type NavSection = 'overview' | 'lessons';

interface NavItem {
  key: TranslationKey;
  icon: string;
  href?: '/' | '/lessons';
  section?: NavSection;
}

const PRIMARY: readonly NavItem[] = [
  { key: 'nav.overview', icon: 'dashboard', href: '/', section: 'overview' },
  { key: 'nav.lessons', icon: 'menu_book', href: '/lessons', section: 'lessons' },
  // Not built yet: shown so the lecturer sees what is coming, but not interactive.
  { key: 'nav.students', icon: 'group' },
  { key: 'nav.results', icon: 'insights' },
  { key: 'nav.library', icon: 'library_books' },
];

const SECONDARY: readonly NavItem[] = [
  { key: 'nav.settings', icon: 'settings' },
  { key: 'nav.help', icon: 'help' },
];

/**
 * Material 3 admin layout: navigation drawer (or a compact rail in the editor), top app bar with
 * search, and the page content.
 */
export function AppShell({
  variant,
  active,
  children,
  topBar = true,
}: {
  variant: 'drawer' | 'rail';
  active: NavSection;
  children: ReactNode;
  topBar?: boolean;
}) {
  const isRail = variant === 'rail';
  const renderItem = (item: NavItem) => {
    const label = t(item.key);
    const selected = item.section === active;
    const content = (
      <>
        <span className={styles.itemIcon}>
          <Icon name={item.icon} filled={selected} />
        </span>
        <span className={styles.itemLabel}>{label}</span>
      </>
    );
    if (item.href === undefined) {
      return (
        <span
          key={item.key}
          className={`${styles.item} ${styles.itemDisabled}`}
          aria-disabled="true"
          title={t('nav.comingSoon')}>
          {content}
        </span>
      );
    }
    return (
      <Link
        key={item.key}
        href={item.href}
        className={`${styles.item} ${selected ? styles.itemSelected : ''}`}
        {...(selected && { 'aria-current': 'page' as const })}>
        {content}
      </Link>
    );
  };

  return (
    <div className={`${styles.shell} ${isRail ? styles.rail : styles.drawer}`}>
      <nav className={styles.nav} aria-label={t('nav.label')}>
        <div className={styles.brand}>
          {isRail ? (
            <span className={styles.brandShort}>{t('app.shortName')}</span>
          ) : (
            <>
              <span className={styles.brandName}>{t('app.name')}</span>
              <span className={styles.brandProduct}>{t('app.product')}</span>
            </>
          )}
        </div>
        <Link
          href="/lessons/new"
          className={styles.fab}
          {...(isRail && { 'aria-label': t('nav.newLesson') })}>
          <Icon name="add" />
          {!isRail && <span>{t('nav.newLesson')}</span>}
        </Link>
        <div className={styles.items}>{PRIMARY.map(renderItem)}</div>
        {!isRail && <div className={styles.divider} />}
        {!isRail && <div className={styles.items}>{SECONDARY.map(renderItem)}</div>}
      </nav>

      <div className={styles.body}>
        {topBar && (
          <header className={styles.topBar}>
            <form action="/lessons" className={styles.search} role="search">
              <Icon name="search" />
              <input
                type="search"
                name="q"
                placeholder={t('topBar.search')}
                aria-label={t('topBar.searchLabel')}
              />
            </form>
            <span className={styles.spacer} />
            <span className={styles.avatar} role="img" aria-label={t('topBar.account')}>
              {t('topBar.accountInitial')}
            </span>
          </header>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
