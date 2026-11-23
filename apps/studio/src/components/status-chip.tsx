import { Icon } from '@/components/icon';
import { t } from '@/i18n';
import type { LessonStatus } from '@/lib/studio-api';

import ui from './ui.module.css';

const STYLE: Readonly<Record<LessonStatus, string | undefined>> = {
  published: ui.statusPublished,
  changed: ui.statusChanged,
  draft: ui.statusDraft,
  unpublished: ui.statusDraft,
};

const ICON: Readonly<Record<LessonStatus, string>> = {
  published: 'check_circle',
  changed: 'edit',
  draft: 'draft',
  unpublished: 'visibility_off',
};

/** Publication state: draft, published version, unpublished changes, or hidden from students. */
export function StatusChip({ status, version }: { status: LessonStatus; version: number | null }) {
  const label =
    status === 'draft' ? t('status.draft') : t(`status.${status}`, { version: version ?? 0 });
  return (
    <span className={`${ui.chip ?? ''} ${STYLE[status] ?? ''}`}>
      <Icon name={ICON[status]} size={16} />
      {label}
    </span>
  );
}
