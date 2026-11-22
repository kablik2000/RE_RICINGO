import { ThemeProvider, themes, useTheme, type ColorSchemeName } from '@ricingo/design-system';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  type Theme as NavigationTheme,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';

/** Navigation chrome (native headers, screen background) derived from our design tokens. */
function toNavigationTheme(scheme: ColorSchemeName): NavigationTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const { colors } = themes[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.onSurface,
      border: colors.outlineVariant,
      notification: colors.primary,
    },
  };
}

const navigationThemes: Readonly<Record<ColorSchemeName, NavigationTheme>> = {
  light: toNavigationTheme('light'),
  dark: toNavigationTheme('dark'),
};

function NavigationThemeBridge({ children }: { children: ReactNode }) {
  const { scheme } = useTheme();
  return (
    <NavigationThemeProvider value={navigationThemes[scheme]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </NavigationThemeProvider>
  );
}

/**
 * App-wide providers. Used by the root layout and by the root error boundary (which renders
 * instead of the layout, so it needs its own providers).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NavigationThemeBridge>{children}</NavigationThemeBridge>
    </ThemeProvider>
  );
}
