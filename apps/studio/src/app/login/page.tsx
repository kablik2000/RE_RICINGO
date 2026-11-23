import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { getTeacher } from '@/lib/auth';
import { safeNextPath } from '@/lib/next-path';

import { LoginForm } from './login-form';
import styles from './login.module.css';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  await connection();
  const next = safeNextPath((await searchParams).next);
  if ((await getTeacher()) !== null) redirect(next);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={`${ui.serif ?? ''} ${styles.brandName ?? ''}`}>{t('app.name')}</span>
          <span className={styles.brandProduct}>{t('app.product')}</span>
        </div>
        <h1 className={styles.title}>{t('login.title')}</h1>
        <p className={ui.muted}>{t('login.intro')}</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
