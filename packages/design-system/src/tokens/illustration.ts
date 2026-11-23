import type { ColorSchemeName } from './color-schemes';
import { palette } from './palette';

/**
 * Colours for vector illustrations (lesson artwork). Artwork is drawn from these named roles only,
 * so it follows light/dark mode and a future brand palette like the rest of the UI.
 */
export interface IllustrationColors {
  /** Background behind a scene. */
  backdrop: string;
  /** Soft disc behind the main object. */
  halo: string;
  /** Small floating highlights. */
  highlight: string;
  /** Table / counter top and its edge. */
  counter: string;
  counterEdge: string;
  /** Porcelain (cups, saucers, plates). */
  porcelain: string;
  /** Brand stripe on objects. */
  accent: string;
  espresso: string;
  crema: string;
  steam: string;
  pastry: string;
  pastryShade: string;
}

export const illustration: Readonly<Record<ColorSchemeName, IllustrationColors>> = {
  light: {
    backdrop: '#F7E6DC',
    halo: palette.red[90],
    highlight: palette.neutral[100],
    counter: '#C89A7E',
    counterEdge: '#B5856A',
    porcelain: palette.neutral[100],
    accent: palette.red[40],
    espresso: '#6B3E2E',
    crema: '#D9A066',
    steam: '#C7AFA8',
    pastry: '#E3A65A',
    pastryShade: '#B9772E',
  },
  dark: {
    backdrop: '#33261F',
    halo: palette.red[30],
    highlight: palette.neutral[30],
    counter: '#6E4C3B',
    counterEdge: '#5A3D2F',
    porcelain: palette.neutral[94],
    accent: palette.red[50],
    espresso: '#4A2A1F',
    crema: '#C68E57',
    steam: '#7F7674',
    pastry: '#C98F48',
    pastryShade: '#9A6224',
  },
};
