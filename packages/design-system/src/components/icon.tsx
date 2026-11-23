import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';

import { useTheme } from '../theme/theme-provider';
import type { ColorRole } from '../tokens/color-schemes';

/**
 * The app's icon set: one semantic name → Material Symbol (Android, web) and SF Symbol (iOS).
 * Add names here instead of passing raw symbol names around, so both platforms stay covered.
 */
export const icons = {
  play: { md: 'play_arrow', sf: 'play.fill' },
  volume: { md: 'volume_up', sf: 'speaker.wave.2.fill' },
  volumeOff: { md: 'volume_off', sf: 'speaker.slash' },
  slow: { md: 'slow_motion_video', sf: 'tortoise.fill' },
  headphones: { md: 'headphones', sf: 'headphones' },
  back: { md: 'arrow_back', sf: 'chevron.left' },
  forward: { md: 'arrow_forward', sf: 'arrow.right' },
  close: { md: 'close', sf: 'xmark' },
  chevronRight: { md: 'chevron_right', sf: 'chevron.right' },
  expand: { md: 'expand_more', sf: 'chevron.down' },
  collapse: { md: 'expand_less', sf: 'chevron.up' },
  search: { md: 'search', sf: 'magnifyingglass' },
  check: { md: 'check', sf: 'checkmark' },
  clear: { md: 'cancel', sf: 'xmark.circle.fill' },
  conversation: { md: 'forum', sf: 'bubble.left.and.bubble.right' },
  sentences: { md: 'notes', sf: 'text.alignleft' },
  grammar: { md: 'school', sf: 'graduationcap' },
  idea: { md: 'lightbulb', sf: 'lightbulb' },
  home: { md: 'home', sf: 'house' },
  book: { md: 'menu_book', sf: 'book' },
  library: { md: 'auto_stories', sf: 'books.vertical' },
  person: { md: 'person', sf: 'person' },
  translate: { md: 'translate', sf: 'character.book.closed' },
  download: { md: 'download', sf: 'arrow.down.circle' },
  sync: { md: 'sync', sf: 'arrow.triangle.2.circlepath' },
  radioOn: { md: 'radio_button_checked', sf: 'largecircle.fill.circle' },
  radioOff: { md: 'radio_button_unchecked', sf: 'circle' },
} as const satisfies Record<string, { md: AndroidSymbol; sf: SFSymbol }>;

export type IconName = keyof typeof icons;

export interface IconProps {
  name: IconName;
  /** Default 24 (Material standard icon size). */
  size?: number;
  color?: ColorRole;
}

/** A decorative icon. Give the surrounding control the accessible label, not the icon. */
export function Icon({ name, size = 24, color = 'onSurfaceVariant' }: IconProps) {
  const theme = useTheme();
  const symbol = icons[name];
  return (
    <SymbolView
      name={{ ios: symbol.sf, android: symbol.md, web: symbol.md }}
      size={size}
      tintColor={theme.colors[color]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
