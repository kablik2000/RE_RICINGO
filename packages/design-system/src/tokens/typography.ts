import { Platform, type TextStyle } from 'react-native';

/**
 * Font families. System fonts until brand typefaces are chosen (DEVELOPMENT_PLAN Q-10);
 * swapping them later only touches this object (plus loading the fonts with expo-font).
 *
 * - `sans`  — UI text.
 * - `serif` — Italian learning content: gives the studied sentence a calm, "book" presence that
 *   visually separates it from interface chrome and from the Czech translation.
 */
export const fontFamilies = {
  sans: Platform.select({ ios: 'System', default: 'sans-serif' }),
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

type TypeStyle = Required<
  Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'fontWeight'>
> &
  Pick<TextStyle, 'letterSpacing' | 'fontStyle'>;

/**
 * Typography roles. Generic UI roles follow the Material 3 scale (trimmed to what we use);
 * the `italian*`, `translation` and `annotation` roles are RICINGO's learning-content roles.
 */
export const typography = {
  display: {
    fontFamily: fontFamilies.sans,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.25,
  },
  headline: {
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: fontWeights.semibold,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: fontWeights.semibold,
  },
  bodyLarge: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: fontWeights.regular,
  },
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: fontWeights.regular,
  },
  bodySmall: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.4,
  },
  /** The Italian sentence currently being studied. */
  italianSentence: {
    fontFamily: fontFamilies.serif,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: fontWeights.regular,
  },
  /** Italian text inside lists and dialogues. */
  italianText: {
    fontFamily: fontFamilies.serif,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: fontWeights.regular,
  },
  /** Czech translation shown under Italian text. */
  translation: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: fontWeights.regular,
    fontStyle: 'italic',
  },
  /** Grammatical annotations (e.g. "condizionale presente · 1. os. j. č."). */
  annotation: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.2,
  },
} as const satisfies Record<string, TypeStyle>;

export type TypographyRole = keyof typeof typography;
