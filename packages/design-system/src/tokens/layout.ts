/** Spacing scale on a 4-pt grid. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  /** Fully rounded (pills, circular buttons). */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;

/** Component dimensions. */
export const sizes = {
  /** Minimum touch target (Material 48 dp; exceeds Apple's 44 pt). */
  minTouchTarget: 48,
  buttonHeight: 48,
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,
  borderWidth: 1,
  /** Readable line length for learning content on tablets and web. */
  maxContentWidth: 640,
} as const;

export const opacity = {
  disabled: 0.38,
  /** Overlay strength of the pressed state layer. */
  pressed: 0.12,
} as const;
