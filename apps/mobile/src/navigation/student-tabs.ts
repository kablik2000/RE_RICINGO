import type { IconName } from '@ricingo/design-system';

import type { TranslationKey } from '@/core/i18n';

/**
 * Student tab bar definition, shared by the native (`_layout.tsx`) and web (`_layout.web.tsx`)
 * tab layouts so both stay in sync. `name` must match a route file in `src/app/(student)/`.
 */
export const studentTabs = [
  { name: 'index', labelKey: 'tabs.home', icon: { sf: 'house', md: 'home' }, webIcon: 'home' },
  {
    name: 'lessons',
    labelKey: 'tabs.learn',
    icon: { sf: 'book.closed', md: 'menu_book' },
    webIcon: 'book',
  },
  {
    name: 'vocabulary',
    labelKey: 'tabs.vocabulary',
    icon: { sf: 'character.book.closed', md: 'translate' },
    webIcon: 'translate',
  },
  {
    name: 'practice',
    labelKey: 'tabs.practice',
    icon: { sf: 'square.and.pencil', md: 'exercise' },
    webIcon: 'practice',
  },
  {
    name: 'profile',
    labelKey: 'tabs.profile',
    icon: { sf: 'person.crop.circle', md: 'person' },
    webIcon: 'person',
  },
] as const satisfies readonly {
  name: string;
  labelKey: TranslationKey;
  icon: { sf: string; md: string };
  /** The same icon from the design system, for the web tab bar (ADR-0019). */
  webIcon: IconName;
}[];
