import Link from 'next/link';
import { connection } from 'next/server';

import { Icon } from '@/components/icon';
import { LessonThumbnail } from '@/components/lesson-thumbnail';
import { ServerUnavailable } from '@/components/server-unavailable';
import { AppShell } from '@/components/shell/app-shell';
import { StatusChip } from '@/components/status-chip';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { formatDate } from '@/lib/format';
import { filterLessons, type LessonFilter, parseLessonFilter } from '@/lib/lesson-filter';
import { listLessons, load, type LessonSummary } from '@/lib/studio-api';

import styles from './lessons.module.css';

const FILTERS: readonly { value: LessonFilter; key: 'all' | 'published' | 'changed' | 'draft' }[] =
  [
    { value: 'all', key: 'all' },
    { value: 'published', key: 'published' },
    { value: 'changed', key: 'changed' },
    { value: 'draft', key: 'draft' },
  ];

function filterHref(filter: LessonFilter, query: string) {
  return {
    pathname: '/lessons' as const,
    query: {
      ...(filter !== 'all' && { status: filter }),
      ...(query !== '' && { q: query }),
    },
  };
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const filter = parseLessonFilter(params.status);
  const query = params.q?.trim() ?? '';

  const result = await load(listLessons());
  const lessons = result.ok ? result.data : [];
  const visible = filterLessons(lessons, filter, query);
  const counts: Record<LessonFilter, number> = {
    all: lessons.length,
    published: filterLessons(lessons, 'published', '').length,
    changed: filterLessons(lessons, 'changed', '').length,
    draft: filterLessons(lessons, 'draft', '').length,
  };

  return (
    <AppShell variant="drawer" active="lessons">
      <main className={ui.page}>
        <div className={ui.pageHeader}>
          <div>
            <h1 className={ui.pageTitle}>{t('lessons.title')}</h1>
            <p className={ui.pageSubtitle}>{t('lessons.subtitle')}</p>
          </div>
          <div className={ui.actions}>
            <Link href="/lessons/new" className={`${ui.button ?? ''} ${ui.filled ?? ''}`}>
              <Icon name="add" size={18} />
              {t('lessons.newLesson')}
            </Link>
          </div>
        </div>
        {!result.ok && <ServerUnavailable detail={result.error.message} />}
        {result.ok && (
          <>
            <nav aria-label={t('lessons.filtersLabel')} className={styles.filters}>
              {FILTERS.map((item) => {
                const selected = item.value === filter;
                return (
                  <Link
                    key={item.value}
                    href={filterHref(item.value, query)}
                    className={`${ui.filterChip ?? ''} ${selected ? (ui.filterChipSelected ?? '') : ''}`}
                    {...(selected && { 'aria-current': 'page' as const })}>
                    {selected && <Icon name="check" size={18} />}
                    {t(`lessons.filters.${item.key}`, { count: counts[item.value] })}
                  </Link>
                );
              })}
            </nav>
            <LessonTable lessons={visible} total={lessons.length} />
          </>
        )}
      </main>
    </AppShell>
  );
}

function LessonTable({ lessons, total }: { lessons: LessonSummary[]; total: number }) {
  return (
    <section
      className={`${ui.card ?? ''} ${styles.tableCard ?? ''}`}
      aria-label={t('lessons.title')}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('lessons.columns.lesson')}</th>
            <th scope="col">{t('lessons.columns.level')}</th>
            <th scope="col" className={styles.numeric}>
              {t('lessons.columns.sentences')}
            </th>
            <th scope="col" className={styles.numeric}>
              {t('lessons.columns.lexemes')}
            </th>
            <th scope="col">{t('lessons.columns.status')}</th>
            <th scope="col">{t('lessons.columns.updated')}</th>
            <th scope="col">
              <span className={ui.visuallyHidden}>{t('common.none')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson) => (
            <tr key={lesson.id}>
              <td>
                <Link href={`/lessons/${lesson.id}`} className={styles.lessonCell}>
                  <LessonThumbnail lessonId={lesson.id} size={56} />
                  <span className={styles.lessonText}>
                    <span className={`${ui.serif ?? ''} ${styles.lessonTitle ?? ''}`}>
                      {lesson.titleItalian}
                    </span>
                    <span className={ui.muted}>{lesson.titleCzech}</span>
                  </span>
                </Link>
              </td>
              <td>
                <span className={`${ui.chip ?? ''} ${ui.chipOutlined ?? ''}`}>{lesson.level}</span>
              </td>
              <td className={styles.numeric}>{lesson.sentenceCount}</td>
              <td className={styles.numeric}>{lesson.lexemeCount}</td>
              <td>
                <StatusChip status={lesson.status} version={lesson.publishedVersion} />
              </td>
              <td className={ui.muted}>{formatDate(lesson.updatedAt)}</td>
              <td>
                <Link
                  href={`/lessons/${lesson.id}`}
                  className={ui.iconButton}
                  aria-label={`${t('nav.lessons')}: ${lesson.titleItalian}`}>
                  <Icon name="chevron_right" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {lessons.length === 0 && (
        <p className={`${ui.muted ?? ''} ${styles.empty ?? ''}`}>{t('lessons.empty')}</p>
      )}
      <div className={styles.footer}>{t('lessons.count', { count: lessons.length, total })}</div>
    </section>
  );
}
