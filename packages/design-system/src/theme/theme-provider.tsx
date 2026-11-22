import { createContext, use, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import type { ColorSchemeName } from '../tokens/color-schemes';
import { themes, type Theme } from './theme';

const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps {
  /** Forces a scheme (e.g. user preference). Defaults to the operating-system setting. */
  scheme?: ColorSchemeName;
  children: ReactNode;
}

export function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const resolvedScheme = scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  return <ThemeContext value={themes[resolvedScheme]}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  const theme = use(ThemeContext);
  if (theme === null) {
    throw new Error('useTheme must be used inside <ThemeProvider>.');
  }
  return theme;
}

/**
 * Creates theme-dependent styles once per theme. Pass a factory defined at module level so its
 * identity is stable:
 *
 * ```ts
 * const createStyles = (theme: Theme) => StyleSheet.create({ ... });
 * const styles = useThemedStyles(createStyles);
 * ```
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
