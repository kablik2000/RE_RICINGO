import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { Icon } from '@/components/icon';
import { ServerUnavailable } from '@/components/server-unavailable';
import { AppShell } from '@/components/shell/app-shell';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { requireTeacher } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { getStudent, listRecommendationOptions, load, type Recommendation } from '@/lib/studio-api';

import { RecommendForm } from './recommend-form';
import { RemoveRecommendation } from './remove-recommendation';
import styles from './student.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KIND_ICONS = { lesson: 'menu_book', practice: 'exercise', vocabulary: 'translate' } as const;
const WORDS_SHOWN = 8;

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const teacher = await requireTeacher();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const result = await load(Promise.all([getStudent(id), listRecommendationOptions()]));
  if (!result.ok && result.error.status === 404) notFound();

  return (
    <AppShell variant="drawer" active="students" teacher={teacher}>
      <main className={ui.page}>
        <Link
          href="/students"
          className={`${ui.button ?? ''} ${ui.text ?? ''} ${styles.back ?? ''}`}>
          <Icon name="arrow_back" size={18} />
          {t('student.back')}
        </Link>
        {result.ok ? (
          <StudentContent detail={result.data[0]} lessons={result.data[1]} />
        ) : (
          <ServerUnavailable detail={result.error.message} />
        )}
      </main>
    </AppShell>
  );
}

function StudentContent({
  detail,
  lessons,
}: {
  detail: Awaited<ReturnType<typeof getStudent>>;
  lessons: Awaited<ReturnType<typeof listRecommendationOptions>>;
}) {
  const { student, recommendations } = detail;
  return (
    <>
      <div>
        <h1 className={ui.pageTitle}>{student.displayName}</h1>
        <p className={ui.pageSubtitle}>
          {student.email}
          {student.isMinor && ` · ${t('students.minor')}`}
        </p>
      </div>
      <div className={styles.columns}>
        <section aria-labelledby="recommend-heading" className={styles.section}>
          <h2 id="recommend-heading" className={styles.sectionTitle}>
            {t('student.recommendTitle')}
          </h2>
          <p className={ui.muted}>{t('student.recommendIntro')}</p>
          {lessons.length === 0 ? (
            <p className={`${ui.card ?? ''} ${ui.muted ?? ''} ${styles.box ?? ''}`}>
              {t('student.noLessons')}
            </p>
          ) : (
            <RecommendForm studentId={student.id} lessons={lessons} />
          )}
        </section>
        <section aria-labelledby="list-heading" className={styles.section}>
          <h2 id="list-heading" className={styles.sectionTitle}>
            {t('student.listTitle', { count: recommendations.length })}
          </h2>
          {recommendations.length === 0 ? (
            <p className={`${ui.card ?? ''} ${ui.muted ?? ''} ${styles.box ?? ''}`}>
              {t('student.empty')}
            </p>
          ) : (
            <ul className={styles.list}>
              {recommendations.map((recommendation) => (
                <RecommendationItem
                  key={recommendation.id}
                  studentId={student.id}
                  recommendation={recommendation}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function detailOf(recommendation: Recommendation): string | null {
  if (recommendation.kind === 'practice') {
    return recommendation.grammarTopic === null
      ? t('student.item.wholeLesson')
      : t('student.item.grammar', { title: recommendation.grammarTopic.title });
  }
  if (recommendation.kind === 'vocabulary') {
    const lemmas = recommendation.words.map((word) => word.lemma);
    const list =
      lemmas.length > WORDS_SHOWN
        ? `${lemmas.slice(0, WORDS_SHOWN).join(', ')}…`
        : lemmas.join(', ');
    return t('student.item.words', { count: lemmas.length, list });
  }
  return null;
}

function RecommendationItem({
  studentId,
  recommendation,
}: {
  studentId: string;
  recommendation: Recommendation;
}) {
  const detail = detailOf(recommendation);
  return (
    <li className={`${ui.card ?? ''} ${styles.item ?? ''}`}>
      <span className={styles.kindIcon}>
        <Icon name={KIND_ICONS[recommendation.kind]} size={20} />
      </span>
      <div className={styles.itemBody}>
        <span className={styles.itemMeta}>
          {t(`student.kinds.${recommendation.kind}`)} · {formatDate(recommendation.createdAt)}
        </span>
        <span className={styles.itemTitle}>
          <span lang="it">{recommendation.lesson.titleItalian}</span>
          <span className={ui.muted}> · {recommendation.lesson.titleCzech}</span>
        </span>
        {detail !== null && <span>{detail}</span>}
        {recommendation.note !== null && (
          <span className={styles.note}>„{recommendation.note}“</span>
        )}
        {!recommendation.available && (
          <span
            className={`${ui.chip ?? ''} ${ui.statusChanged ?? ''} ${styles.unavailable ?? ''}`}>
            {t('student.item.unavailable')}
          </span>
        )}
      </div>
      <RemoveRecommendation studentId={studentId} recommendationId={recommendation.id} />
    </li>
  );
}
