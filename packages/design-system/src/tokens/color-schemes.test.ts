import { colorSchemes, type ColorRoles, type ColorSchemeName } from './color-schemes';

/** WCAG 2.x relative luminance of a #RRGGBB colour. */
function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    throw new Error(`Expected #RRGGBB colour, got "${hex}"`);
  }
  const [red, green, blue] = match.slice(1).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** WCAG AA minimum for normal-size text. */
const MIN_TEXT_CONTRAST = 4.5;

const textPairs: readonly (readonly [keyof ColorRoles, keyof ColorRoles])[] = [
  ['onPrimary', 'primary'],
  ['onPrimaryContainer', 'primaryContainer'],
  ['onBackground', 'background'],
  ['onSurface', 'surface'],
  ['onSurfaceVariant', 'surface'],
  ['onSurface', 'surfaceContainerHigh'],
  ['onSuccess', 'success'],
  ['onSuccessContainer', 'successContainer'],
  ['onWarning', 'warning'],
  ['onWarningContainer', 'warningContainer'],
  ['onError', 'error'],
  ['onErrorContainer', 'errorContainer'],
  ['primary', 'background'],
  ['error', 'background'],
];

const schemes: readonly ColorSchemeName[] = ['light', 'dark'];

describe('colour schemes', () => {
  it.each(schemes.flatMap((scheme) => textPairs.map(([fg, bg]) => [scheme, fg, bg] as const)))(
    '%s: %s on %s meets WCAG AA',
    (scheme, foreground, background) => {
      const roles = colorSchemes[scheme];
      expect(contrastRatio(roles[foreground], roles[background])).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      );
    },
  );

  it('light and dark schemes define the same roles', () => {
    expect(Object.keys(colorSchemes.dark).sort()).toEqual(Object.keys(colorSchemes.light).sort());
  });
});
