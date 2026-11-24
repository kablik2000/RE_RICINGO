import { AppShell } from '@/components/shell/app-shell';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { requireTeacher } from '@/lib/auth';

import { InviteForm } from './invite-form';

export default async function InviteStudentPage() {
  const teacher = await requireTeacher();
  return (
    <AppShell variant="drawer" active="students" teacher={teacher}>
      <main className={ui.page}>
        <div>
          <h1 className={ui.pageTitle}>{t('students.inviteTitle')}</h1>
          <p className={ui.pageSubtitle}>{t('students.inviteIntro')}</p>
        </div>
        <InviteForm />
      </main>
    </AppShell>
  );
}
