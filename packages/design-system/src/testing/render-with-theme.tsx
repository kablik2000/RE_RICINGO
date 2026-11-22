import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme/theme-provider';
import type { ColorSchemeName } from '../tokens/color-schemes';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Test-only helper: renders UI inside the providers every design-system component expects. */
export function renderWithTheme(ui: ReactElement, scheme: ColorSchemeName = 'light') {
  function Providers({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <ThemeProvider scheme={scheme}>{children}</ThemeProvider>
      </SafeAreaProvider>
    );
  }
  // `wrapper` keeps the providers in place across `rerender` calls.
  return render(ui, { wrapper: Providers });
}
