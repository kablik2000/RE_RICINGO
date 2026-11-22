import { Stack, type ErrorBoundaryProps } from 'expo-router';

import { AppProviders, RouteErrorBoundary } from '@/core/ui';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <AppProviders>
      <RouteErrorBoundary {...props} />
    </AppProviders>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
