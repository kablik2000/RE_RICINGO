import { Icon } from '@/components/icon';
import { t } from '@/i18n';
import type { Visibility } from '@/lib/studio-api';

import ui from './ui.module.css';

export const VISIBILITY_ICON: Readonly<Record<Visibility, string>> = {
  public: 'public',
  students: 'lock',
};

/** Who sees a published lesson in the app (ADR-0013): everyone, or the lecturer's students. */
export function VisibilityChip({ visibility }: { visibility: Visibility }) {
  return (
    <span className={`${ui.chip ?? ''} ${ui.chipOutlined ?? ''}`}>
      <Icon name={VISIBILITY_ICON[visibility]} size={16} />
      {t(`visibility.${visibility}.short`)}
    </span>
  );
}
