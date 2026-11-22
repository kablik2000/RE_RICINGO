import type { ColorSchemeName } from './color-schemes';

/**
 * Elevation levels expressed as CSS-like `boxShadow` values (supported by React Native's
 * New Architecture on iOS and Android). Dark scheme relies more on surface tone than on shadow.
 */
export type ElevationLevel = 0 | 1 | 2 | 3;

const lightShadows: Record<ElevationLevel, string> = {
  0: 'none',
  1: '0px 1px 2px rgba(29, 26, 25, 0.10), 0px 1px 3px rgba(29, 26, 25, 0.06)',
  2: '0px 2px 6px rgba(29, 26, 25, 0.10), 0px 1px 2px rgba(29, 26, 25, 0.08)',
  3: '0px 6px 16px rgba(29, 26, 25, 0.12), 0px 2px 4px rgba(29, 26, 25, 0.08)',
};

const darkShadows: Record<ElevationLevel, string> = {
  0: 'none',
  1: '0px 1px 2px rgba(0, 0, 0, 0.30)',
  2: '0px 2px 6px rgba(0, 0, 0, 0.35)',
  3: '0px 6px 16px rgba(0, 0, 0, 0.40)',
};

export const elevation: Readonly<
  Record<ColorSchemeName, Readonly<Record<ElevationLevel, string>>>
> = { light: lightShadows, dark: darkShadows };
