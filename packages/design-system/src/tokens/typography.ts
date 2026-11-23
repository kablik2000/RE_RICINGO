import type { TextStyle } from 'react-native';

/**
 * Font families (design v1, approved 2026-11-23): Roboto for the interface, Noto Serif for Italian
 * learning content — the serif gives the studied language a calm "book" presence that separates it
 * from interface chrome and from Czech translations.
 *
 * Each weight/style is its own family name because Android cannot pick weights of a custom font by
 * `fontWeight`. The app loads exactly these names at startup (`apps/mobile/src/core/ui/fonts.ts`);
 * until they are loaded the platform falls back to its default font.
 */
export const fontFamilies = {
  sansRegular: 'Roboto_400Regular',
  sansMedium: 'Roboto_500Medium',
  sansBold: 'Roboto_700Bold',
  serifRegular: 'NotoSerif_400Regular',
  serifItalic: 'NotoSerif_400Regular_Italic',
  serifSemiBold: 'NotoSerif_600SemiBold',
} as const;

export type FontFamilyName = (typeof fontFamilies)[keyof typeof fontFamilies];

/** The family name already carries the weight; `normal` avoids synthetic bolding. */
const WEIGHT_FROM_FAMILY: TextStyle['fontWeight'] = 'normal';

interface TypeStyleExtras {
  letterSpacing?: number;
  textTransform?: 'uppercase';
}

/** One typography role; numeric fields are plain numbers so web tokens can be derived from them. */
export interface TypeStyle extends TypeStyleExtras {
  fontFamily: FontFamilyName;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
}

function role(
  fontFamily: FontFamilyName,
  fontSize: number,
  lineHeight: number,
  extra: TypeStyleExtras = {},
): TypeStyle {
  return { fontFamily, fontSize, lineHeight, fontWeight: WEIGHT_FROM_FAMILY, ...extra };
}

/**
 * Typography roles. Interface roles follow the Material 3 type scale (trimmed to what we use); the
 * `italian*`, `translation` and `annotation` roles are the learning-content roles.
 */
export const typography = {
  /** Screen titles of tab screens ("Slovník"). M3 headline large. */
  headline: role(fontFamilies.sansRegular, 32, 40),
  /** Section titles ("Všechny lekce"). M3 title large. */
  title: role(fontFamilies.sansRegular, 22, 28),
  /** Sub-section and card titles. M3 title medium. */
  titleSmall: role(fontFamilies.sansMedium, 16, 24, { letterSpacing: 0.15 }),
  bodyLarge: role(fontFamilies.sansRegular, 16, 24, { letterSpacing: 0.15 }),
  body: role(fontFamilies.sansRegular, 14, 20, { letterSpacing: 0.25 }),
  bodySmall: role(fontFamilies.sansRegular, 12, 16, { letterSpacing: 0.4 }),
  /** Buttons, tabs, prominent numbers' labels. M3 label large. */
  label: role(fontFamilies.sansMedium, 14, 20, { letterSpacing: 0.1 }),
  labelSmall: role(fontFamilies.sansMedium, 12, 16, { letterSpacing: 0.5 }),
  /** Small all-caps kicker above a title ("VAŠE PRVNÍ LEKCE"). */
  overline: role(fontFamilies.sansMedium, 12, 16, {
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  }),
  /** Large numbers in stat tiles. */
  numeral: role(fontFamilies.sansMedium, 22, 28),

  /** Lesson title on its intro screen. */
  italianDisplay: role(fontFamilies.serifSemiBold, 36, 44),
  /** Italian greeting / large Italian heading. */
  italianHeadline: role(fontFamilies.serifRegular, 32, 40),
  /** Italian titles in cards (lesson name, analysed word). */
  italianTitle: role(fontFamilies.serifSemiBold, 22, 30),
  /** Italian titles in list rows. */
  italianTitleSmall: role(fontFamilies.serifSemiBold, 18, 24),
  /** The Italian sentence currently being studied. */
  italianSentence: role(fontFamilies.serifRegular, 26, 38),
  /** Italian text inside lists and dialogues. */
  italianText: role(fontFamilies.serifRegular, 18, 26),
  /** Czech translation shown under Italian text. */
  translation: role(fontFamilies.serifItalic, 16, 24),
  /** Grammatical annotations (e.g. "condizionale presente · 1. os. j. č."). */
  annotation: role(fontFamilies.sansMedium, 12, 16, { letterSpacing: 0.4 }),
} as const satisfies Record<string, TypeStyle>;

export type TypographyRole = keyof typeof typography;
