import Link from 'next/link';
import { connection } from 'next/server';

import { Icon } from '@/components/icon';
import { ServerUnavailable } from '@/components/server-unavailable';
import { AppShell } from '@/components/shell/app-shell';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { requireTeacher } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { type Invitation, listStudents, load, type Student } from '@/lib/studio-api';

import { InvitationActions, StudentActions } from './row-actions';
import styles from './students.module.css';

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string }>;
}) {
  await connection();
  const teacher = await requireTeacher();
  const invited = (await searchParams).invited === '1';
  const result = await load(listStudents());

  return (
    <AppShell variant="drawer" active="students" teacher={teacher}>
      <main className={ui.page}>
        <div className={ui.pageHeader}>
          <div>
            <h1 className={ui.pageTitle}>{t('students.title')}</h1>
            <p className={ui.pageSubtitle}>{t('students.intro')}</p>
          </div>
          <div className={ui.actions}>
            <Link href="/students/invite" className={`${ui.button ?? ''} ${ui.filled ?? ''}`}>
              <Icon name="person_add" size={18} />
              {t('students.invite')}
            </Link>
          </div>
        </div>
        {invited && (
          <p role="status" className={styles.notice}>
            {t('students.invited')}
          </p>
        )}
        {result.ok ? (
          <>
            <StudentTable students={result.data.students} />
            <InvitationTable invitations={result.data.invitations} />
          </>
        ) : (
          <ServerUnavailable detail={result.error.message} />
        )}
      </main>
    </AppShell>
  );
}

function StudentTable({ students }: { students: Student[] }) {
  return (
    <section aria-labelledby="students-heading" className={styles.section}>
      <h2 id="students-heading" className={styles.sectionTitle}>
        {t('students.listTitle', { count: students.length })}
      </h2>
      <div className={`${ui.card ?? ''} ${styles.tableCard ?? ''}`}>
        {students.length === 0 ? (
          <p className={`${ui.muted ?? ''} ${styles.empty ?? ''}`}>{t('students.empty')}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('students.columns.student')}</th>
                <th scope="col">{t('students.columns.age')}</th>
                <th scope="col">{t('students.columns.devices')}</th>
                <th scope="col">{t('students.columns.since')}</th>
                <th scope="col">
                  <span className={ui.visuallyHidden}>{t('students.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <span className={styles.person}>
                      <span className={styles.personName}>{student.displayName}</span>
                      <span className={ui.muted}>{student.email}</span>
                    </span>
                  </td>
                  <td>{student.isMinor ? t('students.minor') : t('common.none')}</td>
                  <td>{t('students.devices', { count: student.deviceCount })}</td>
                  <td className={ui.muted}>{formatDate(student.since)}</td>
                  <td>
                    <StudentActions
                      id={student.id}
                      name={student.displayName}
                      deviceCount={student.deviceCount}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function InvitationTable({ invitations }: { invitations: Invitation[] }) {
  if (invitations.length === 0) return null;
  return (
    <section aria-labelledby="invitations-heading" className={styles.section}>
      <h2 id="invitations-heading" className={styles.sectionTitle}>
        {t('students.invitationsTitle', { count: invitations.length })}
      </h2>
      <div className={`${ui.card ?? ''} ${styles.tableCard ?? ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t('students.columns.student')}</th>
              <th scope="col">{t('students.columns.age')}</th>
              <th scope="col">{t('students.columns.status')}</th>
              <th scope="col">
                <span className={ui.visuallyHidden}>{t('students.columns.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => (
              <tr key={invitation.id}>
                <td>
                  <span className={styles.person}>
                    <span className={styles.personName}>{invitation.displayName}</span>
                    <span className={ui.muted}>{invitation.email}</span>
                  </span>
                </td>
                <td>{invitation.isMinor ? t('students.minor') : t('common.none')}</td>
                <td>
                  <span
                    className={`${ui.chip ?? ''} ${
                      invitation.status === 'expired'
                        ? (ui.statusChanged ?? '')
                        : (ui.statusDraft ?? '')
                    }`}>
                    {invitation.status === 'expired'
                      ? t('students.status.expired', { date: formatDate(invitation.expiresAt) })
                      : t('students.status.pending', { date: formatDate(invitation.expiresAt) })}
                  </span>
                </td>
                <td>
                  <InvitationActions id={invitation.id} email={invitation.email} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
