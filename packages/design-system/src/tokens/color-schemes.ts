import { palette } from './palette';

/**
 * Semantic colour roles (Material 3–inspired). Every `on*` role is the content colour used on top
 * of its base role and must meet WCAG AA contrast (verified in `color-schemes.test.ts`).
 */
export interface ColorRoles {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;

  outline: string;
  outlineVariant: string;

  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;

  warning: string;
  onWarning: string;
  warningContainer: string;
  onWarningContainer: string;

  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  /** Translucent overlay behind modals and sheets. */
  scrim: string;
}

export type ColorRole = keyof ColorRoles;
export type ColorSchemeName = 'light' | 'dark';

const light: ColorRoles = {
  primary: palette.red[40],
  onPrimary: palette.neutral[100],
  primaryContainer: palette.red[90],
  onPrimaryContainer: palette.red[10],

  background: palette.neutral[98],
  onBackground: palette.neutral[10],
  surface: palette.neutral[100],
  onSurface: palette.neutral[10],
  onSurfaceVariant: palette.neutralVariant[30],
  surfaceContainerLow: palette.neutral[96],
  surfaceContainer: palette.neutral[94],
  surfaceContainerHigh: palette.neutral[90],

  outline: palette.neutral[50],
  outlineVariant: palette.neutralVariant[80],

  success: palette.green[40],
  onSuccess: palette.neutral[100],
  successContainer: palette.green[90],
  onSuccessContainer: palette.green[20],

  warning: palette.amber[40],
  onWarning: palette.neutral[100],
  warningContainer: palette.amber[90],
  onWarningContainer: palette.amber[20],

  error: palette.error[40],
  onError: palette.neutral[100],
  errorContainer: palette.error[90],
  onErrorContainer: palette.error[20],

  scrim: 'rgba(0, 0, 0, 0.4)',
};

const dark: ColorRoles = {
  primary: palette.red[80],
  onPrimary: palette.red[20],
  primaryContainer: palette.red[30],
  onPrimaryContainer: palette.red[90],

  background: palette.neutral[6],
  onBackground: palette.neutral[90],
  surface: palette.neutral[10],
  onSurface: palette.neutral[90],
  onSurfaceVariant: palette.neutralVariant[80],
  surfaceContainerLow: palette.neutral[12],
  surfaceContainer: palette.neutral[17],
  surfaceContainerHigh: palette.neutral[22],

  outline: palette.neutral[60],
  outlineVariant: palette.neutralVariant[30],

  success: palette.green[80],
  onSuccess: palette.green[20],
  successContainer: palette.green[30],
  onSuccessContainer: palette.green[90],

  warning: palette.amber[80],
  onWarning: palette.amber[20],
  warningContainer: palette.amber[30],
  onWarningContainer: palette.amber[90],

  error: palette.error[80],
  onError: palette.error[20],
  errorContainer: palette.error[30],
  onErrorContainer: palette.error[90],

  scrim: 'rgba(0, 0, 0, 0.6)',
};

export const colorSchemes: Readonly<Record<ColorSchemeName, ColorRoles>> = { light, dark };
