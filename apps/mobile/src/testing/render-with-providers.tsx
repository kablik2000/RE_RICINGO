import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProviders } from '@/core/ui';
import { createQueryClient, DataProvider } from '@/data';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Test-only helper: renders UI with the same providers the app uses (fresh query cache). */
export function renderWithProviders(ui: ReactElement) {
  const client = createQueryClient();
  // No garbage-collection timers left running after a test (TanStack Query testing guidance).
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
  });
  function Providers({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <AppProviders>
          <DataProvider client={client}>{children}</DataProvider>
        </AppProviders>
      </SafeAreaProvider>
    );
  }
  return render(ui, { wrapper: Providers });
}
