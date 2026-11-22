import { colorSchemes, type ColorRoles, type ColorSchemeName } from '../tokens/color-schemes';
import { elevation, type ElevationLevel } from '../tokens/elevation';
import { opacity, radius, sizes, spacing } from '../tokens/layout';
import { motion } from '../tokens/motion';
import { typography } from '../tokens/typography';

/** Fully resolved design tokens for one colour scheme. The only object components read from. */
export interface Theme {
  scheme: ColorSchemeName;
  colors: ColorRoles;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  sizes: typeof sizes;
  opacity: typeof opacity;
  elevation: Readonly<Record<ElevationLevel, string>>;
  motion: typeof motion;
}

function createTheme(scheme: ColorSchemeName): Theme {
  return {
    scheme,
    colors: colorSchemes[scheme],
    typography,
    spacing,
    radius,
    sizes,
    opacity,
    elevation: elevation[scheme],
    motion,
  };
}

/** Pre-built, referentially stable themes (safe to use as memo dependencies). */
export const themes: Readonly<Record<ColorSchemeName, Theme>> = {
  light: createTheme('light'),
  dark: createTheme('dark'),
};
