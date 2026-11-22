import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProviders } from '@/core/ui';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <AppProviders>{children}</AppProviders>
    </SafeAreaProvider>
  );
}

/** Test-only helper: renders UI with the same providers the app uses. */
export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: Providers });
}
