import { AppShell } from '@/components/shell/app-shell';
import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { requireTeacher } from '@/lib/auth';

import styles from './account.module.css';
import { PasswordForm } from './password-form';

export default async function AccountPage() {
  const teacher = await requireTeacher();
  return (
    <AppShell variant="drawer" active="account" teacher={teacher}>
      <main className={ui.page}>
        <div>
          <h1 className={ui.pageTitle}>{t('account.title')}</h1>
          <p className={ui.pageSubtitle}>{t('account.intro')}</p>
        </div>
        <section className={`${ui.card ?? ''} ${styles.card ?? ''}`}>
          <dl className={styles.details}>
            <dt>{t('account.name')}</dt>
            <dd>{teacher.displayName}</dd>
            <dt>{t('account.email')}</dt>
            <dd>{teacher.email}</dd>
          </dl>
        </section>
        <section className={`${ui.card ?? ''} ${styles.card ?? ''}`}>
          <h2 className={ui.cardTitle}>{t('account.passwordTitle')}</h2>
          <p className={ui.muted}>{t('account.passwordIntro')}</p>
          <PasswordForm email={teacher.email} />
        </section>
      </main>
    </AppShell>
  );
}
