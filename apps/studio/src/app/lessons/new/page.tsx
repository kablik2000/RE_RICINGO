import { AppShell } from '@/components/shell/app-shell';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { requireTeacher } from '@/lib/auth';

import { NewLessonForm } from './new-lesson-form';

export default async function NewLessonPage() {
  const teacher = await requireTeacher();
  return (
    <AppShell variant="drawer" active="lessons" teacher={teacher}>
      <main className={ui.page}>
        <div>
          <h1 className={ui.pageTitle}>{t('newLesson.title')}</h1>
          <p className={ui.pageSubtitle}>{t('newLesson.intro')}</p>
        </div>
        <NewLessonForm />
      </main>
    </AppShell>
  );
}
