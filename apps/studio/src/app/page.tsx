import Link from 'next/link';
import { connection } from 'next/server';

import { Icon } from '@/components/icon';
import { LessonThumbnail } from '@/components/lesson-thumbnail';
import { ServerUnavailable } from '@/components/server-unavailable';
import { AppShell } from '@/components/shell/app-shell';
import { StatusChip } from '@/components/status-chip';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { apiBaseUrl, fetchApiStatus } from '@/lib/api-status';
import { formatDate, formatLongDate } from '@/lib/format';
import {
  getOverview,
  type LessonSummary,
  listLessons,
  load,
  type StudioOverview,
} from '@/lib/studio-api';

import styles from './overview.module.css';

const RECENT_LESSONS = 5;

export default async function OverviewPage() {
  // Rendered per request: counts and backend status must be current.
  await connection();
  const status = await fetchApiStatus(apiBaseUrl());

  const result = await load(Promise.all([getOverview(), listLessons()]));

  return (
    <AppShell variant="drawer" active="overview">
      <main className={ui.page}>
        <div className={ui.pageHeader}>
          <div>
            <h1 className={ui.pageTitle}>{t('overview.title')}</h1>
            <p className={ui.pageSubtitle}>{formatLongDate(new Date())}</p>
          </div>
          <div className={ui.actions}>
            <Link href="/lessons/new" className={`${ui.button ?? ''} ${ui.filled ?? ''}`}>
              <Icon name="add" size={18} />
              {t('overview.newLesson')}
            </Link>
          </div>
        </div>

        {result.ok ? (
          <OverviewData overview={result.data[0]} lessons={result.data[1]} />
        ) : (
          <ServerUnavailable detail={result.error.message} />
        )}

        <div className={styles.twoColumns}>
          <section aria-labelledby="quick" className={`${ui.card ?? ''} ${styles.quick ?? ''}`}>
            <h2 id="quick" className={ui.cardTitle}>
              {t('overview.quickActions.title')}
            </h2>
            <div className={styles.quickGrid}>
              <Link href="/lessons/new" className={styles.quickAction}>
                <Icon name="edit_note" />
                <span>
                  <span className={styles.quickTitle}>{t('overview.quickActions.newLesson')}</span>
                  <span className={ui.muted}>{t('overview.quickActions.newLessonDetail')}</span>
                </span>
              </Link>
              <Link href="/lessons" className={styles.quickAction}>
                <Icon name="menu_book" />
                <span>
                  <span className={styles.quickTitle}>{t('overview.quickActions.lessons')}</span>
                  <span className={ui.muted}>{t('overview.quickActions.lessonsDetail')}</span>
                </span>
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="system"
            className={`${ui.cardTonal ?? ''} ${styles.system ?? ''}`}>
            <h2 id="system" className={styles.systemTitle}>
              {t('overview.system.title')}
            </h2>
            <p className={styles.systemRow} data-status={status.kind}>
              <span className={styles.dot} />
              {t(`overview.system.${status.kind}`)}
            </p>
            <p className={styles.systemRow} data-status="warning">
              <span className={styles.dot} />
              {t('overview.system.backups')}
            </p>
            <p className={`${ui.muted ?? ''} ${styles.systemNote ?? ''}`}>
              {t('overview.system.environment')}
            </p>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function OverviewData({
  overview,
  lessons,
}: {
  overview: StudioOverview;
  lessons: LessonSummary[];
}) {
  const stats = [
    {
      label: t('overview.stats.lessons'),
      value: overview.lessons.total,
      detail: t('overview.stats.lessonsDetail', {
        published: overview.lessons.published,
        drafts: overview.lessons.withDraftChanges,
      }),
      icon: 'menu_book',
      tone: styles.tonePrimary,
    },
    {
      label: t('overview.stats.students'),
      value: overview.students,
      detail: t('overview.stats.studentsDetail'),
      icon: 'group',
      tone: styles.toneWarning,
    },
    {
      label: t('overview.stats.lexemes'),
      value: overview.publishedLexemes,
      detail: t('overview.stats.lexemesDetail'),
      icon: 'translate',
      tone: styles.toneSuccess,
    },
    {
      label: t('overview.stats.topics'),
      value: overview.publishedGrammarTopics,
      detail: t('overview.stats.topicsDetail'),
      icon: 'school',
      tone: styles.toneNeutral,
    },
  ];

  return (
    <>
      <section aria-label={t('overview.stats.label')} className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={`${ui.card ?? ''} ${styles.stat ?? ''}`}>
            <span className={`${styles.statIcon ?? ''} ${stat.tone ?? ''}`}>
              <Icon name={stat.icon} />
            </span>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statDetail}>{stat.detail}</span>
          </div>
        ))}
      </section>

      <div className={styles.twoColumns}>
        <section aria-labelledby="recent" className={`${ui.card ?? ''} ${styles.recent ?? ''}`}>
          <div className={styles.cardHeader}>
            <h2 id="recent" className={ui.cardTitle}>
              {t('overview.recent.title')}
            </h2>
            <Link href="/lessons" className={`${ui.button ?? ''} ${ui.text ?? ''}`}>
              {t('overview.recent.all')}
            </Link>
          </div>
          {lessons.length === 0 ? (
            <p className={`${ui.muted ?? ''} ${styles.cardBody ?? ''}`}>
              {t('overview.recent.empty')}
            </p>
          ) : (
            <ul className={styles.recentList}>
              {lessons.slice(0, RECENT_LESSONS).map((lesson) => (
                <li key={lesson.id}>
                  <Link href={`/lessons/${lesson.id}`} className={styles.recentRow}>
                    <LessonThumbnail lessonId={lesson.id} />
                    <span className={styles.recentText}>
                      <span className={`${ui.serif ?? ''} ${styles.recentTitle ?? ''}`}>
                        {lesson.titleItalian}
                      </span>
                      <span className={ui.muted}>
                        {t('lessons.meta', {
                          czech: lesson.titleCzech,
                          sentences: lesson.sentenceCount,
                          exchanges: lesson.exchangeCount,
                        })}
                      </span>
                    </span>
                    <span className={`${ui.chip ?? ''} ${ui.chipOutlined ?? ''}`}>
                      {lesson.level}
                    </span>
                    <StatusChip status={lesson.status} version={lesson.publishedVersion} />
                    <span className={`${ui.muted ?? ''} ${styles.date ?? ''}`}>
                      {formatDate(lesson.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="students" className={`${ui.card ?? ''} ${styles.empty ?? ''}`}>
          <span className={`${styles.emptyIcon ?? ''} ${styles.toneWarning ?? ''}`}>
            <Icon name="group_add" size={32} />
          </span>
          <h2 id="students" className={styles.emptyTitle}>
            {t('overview.students.title')}
          </h2>
          <p className={ui.muted}>{t('overview.students.message')}</p>
        </section>
      </div>
    </>
  );
}
