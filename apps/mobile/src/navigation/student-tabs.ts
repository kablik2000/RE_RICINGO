import type { TranslationKey } from '@/core/i18n';

/**
 * Student tab bar definition, shared by the native (`_layout.tsx`) and web (`_layout.web.tsx`)
 * tab layouts so both stay in sync. `name` must match a route file in `src/app/(student)/`.
 */
export const studentTabs = [
  { name: 'index', labelKey: 'tabs.learn', icon: { sf: 'book.closed', md: 'menu_book' } },
  {
    name: 'vocabulary',
    labelKey: 'tabs.vocabulary',
    icon: { sf: 'character.book.closed', md: 'dictionary' },
  },
  {
    name: 'practice',
    labelKey: 'tabs.practice',
    icon: { sf: 'square.and.pencil', md: 'edit_note' },
  },
  {
    name: 'profile',
    labelKey: 'tabs.profile',
    icon: { sf: 'person.crop.circle', md: 'account_circle' },
  },
] as const satisfies readonly {
  name: string;
  labelKey: TranslationKey;
  icon: { sf: string; md: string };
}[];
