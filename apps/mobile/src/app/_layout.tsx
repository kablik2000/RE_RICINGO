import { Stack, type ErrorBoundaryProps } from 'expo-router';

import { t } from '@/core/i18n';
import { AppProviders, RouteErrorBoundary } from '@/core/ui';
import { DataProvider } from '@/data';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <AppProviders>
      <RouteErrorBoundary {...props} />
    </AppProviders>
  );
}

const withHeader = { headerShown: true, headerBackButtonDisplayMode: 'minimal' } as const;

export default function RootLayout() {
  return (
    <AppProviders>
      <DataProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(student)" />
          <Stack.Screen name="lesson/[lessonId]/index" options={{ ...withHeader, title: '' }} />
          <Stack.Screen
            name="lesson/[lessonId]/study"
            options={{ ...withHeader, title: t('study.analysis') }}
          />
          <Stack.Screen
            name="lesson/[lessonId]/dialogue"
            options={{ ...withHeader, title: t('dialogue.title') }}
          />
        </Stack>
      </DataProvider>
    </AppProviders>
  );
}
