import { connection } from 'next/server';

import { BarList, MonthChart } from '@/components/charts';
import { Icon } from '@/components/icon';
import { ServerUnavailable } from '@/components/server-unavailable';
import { AppShell } from '@/components/shell/app-shell';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { requireTeacher } from '@/lib/auth';
import { getStatistics, LEVELS, load, type StudioStatistics } from '@/lib/studio-api';

import styles from './statistics.module.css';

const STATUSES = ['draft', 'published', 'changed', 'unpublished'] as const;
const INVITATIONS = ['pending', 'accepted', 'expired', 'revoked'] as const;

export default async function StatisticsPage() {
  // Rendered per request: the numbers must be current.
  await connection();
  const teacher = await requireTeacher();
  const result = await load(getStatistics());
  return (
    <AppShell variant="drawer" active="statistics" teacher={teacher}>
      <main className={ui.page}>
        <div>
          <h1 className={ui.pageTitle}>{t('statistics.title')}</h1>
          <p className={ui.pageSubtitle}>{t('statistics.intro')}</p>
        </div>
        {result.ok ? (
          <Statistics data={result.data} />
        ) : (
          <ServerUnavailable detail={result.error.message} />
        )}
      </main>
    </AppShell>
  );
}

function Statistics({ data }: { data: StudioStatistics }) {
  const { lessons, students, invitations } = data;
  const totalLessons = STATUSES.reduce((sum, status) => sum + lessons.byStatus[status], 0);
  const tiles = [
    {
      label: t('statistics.tiles.lessons'),
      value: totalLessons,
      detail: t('statistics.tiles.lessonsDetail', {
        published: lessons.byStatus.published + lessons.byStatus.changed,
        public: lessons.public,
      }),
      icon: 'menu_book',
    },
    {
      label: t('statistics.tiles.sentences'),
      value: lessons.sentences,
      detail: t('statistics.tiles.sentencesDetail'),
      icon: 'chat',
    },
    {
      label: t('statistics.tiles.lexemes'),
      value: lessons.publishedLexemes,
      detail: t('statistics.tiles.lexemesDetail'),
      icon: 'translate',
    },
    {
      label: t('statistics.tiles.topics'),
      value: lessons.publishedGrammarTopics,
      detail: t('statistics.tiles.topicsDetail'),
      icon: 'school',
    },
    {
      label: t('statistics.tiles.students'),
      value: students.total,
      detail: t('statistics.tiles.studentsDetail', { minors: students.minors }),
      icon: 'group',
    },
    {
      label: t('statistics.tiles.active'),
      value: students.activeLast7Days,
      detail: t('statistics.tiles.activeDetail', { month: students.activeLast30Days }),
      icon: 'trending_up',
    },
    {
      label: t('statistics.tiles.recommendations'),
      value: data.recommendations,
      detail: t('statistics.tiles.recommendationsDetail'),
      icon: 'recommend',
    },
  ];

  return (
    <>
      <section aria-label={t('statistics.tiles.label')} className={styles.tiles}>
        {tiles.map((tile) => (
          <div key={tile.label} className={`${ui.card ?? ''} ${styles.tile ?? ''}`}>
            <span className={styles.tileHead}>
              <Icon name={tile.icon} size={20} />
              {tile.label}
            </span>
            <span className={styles.tileValue}>{tile.value}</span>
            <span className={styles.tileDetail}>{tile.detail}</span>
          </div>
        ))}
      </section>

      <div className={styles.grid}>
        <section className={`${ui.card ?? ''} ${styles.card ?? ''}`}>
          <h2 className={styles.cardTitle}>{t('statistics.byLevel')}</h2>
          <BarList
            items={LEVELS.map((level) => ({
              key: level,
              label: level,
              value: lessons.byLevel[level],
            }))}
          />
        </section>
        <section className={`${ui.card ?? ''} ${styles.card ?? ''}`}>
          <h2 className={styles.cardTitle}>{t('statistics.byStatus')}</h2>
          <BarList
            items={STATUSES.map((status) => ({
              key: status,
              label: t(`statistics.status.${status}`),
              value: lessons.byStatus[status],
            }))}
          />
        </section>
        <section className={`${ui.card ?? ''} ${styles.card ?? ''}`}>
          <h2 className={styles.cardTitle}>{t('statistics.invitations')}</h2>
          <BarList
            items={INVITATIONS.map((state) => ({
              key: state,
              label: t(`statistics.invitation.${state}`),
              value: invitations[state],
            }))}
          />
        </section>
      </div>

      <section className={`${ui.card ?? ''} ${styles.card ?? ''}`}>
        <h2 className={styles.cardTitle}>{t('statistics.activity')}</h2>
        <div className={styles.months}>
          <MonthChart
            title={t('statistics.studentsJoined')}
            data={data.months.map((m) => ({ month: m.month, value: m.studentsJoined }))}
          />
          <MonthChart
            title={t('statistics.lessonsPublished')}
            data={data.months.map((m) => ({ month: m.month, value: m.lessonsPublished }))}
          />
        </div>
      </section>

      <p className={`${ui.muted ?? ''} ${styles.note ?? ''}`}>
        <Icon name="info" size={18} />
        {t('statistics.resultsNote')}
      </p>
    </>
  );
}
