import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { LessonEditor } from '@/components/editor/lesson-editor';
import { ServerUnavailable } from '@/components/server-unavailable';
import { AppShell } from '@/components/shell/app-shell';
import ui from '@/components/ui.module.css';
import { getLesson, load } from '@/lib/studio-api';

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const result = await load(getLesson(id));
  if (!result.ok && result.error.status === 404) notFound();

  return (
    <AppShell variant="rail" active="lessons" topBar={false}>
      {result.ok ? (
        <LessonEditor initial={result.data} />
      ) : (
        <main className={ui.page}>
          <ServerUnavailable detail={result.error.message} />
        </main>
      )}
    </AppShell>
  );
}
