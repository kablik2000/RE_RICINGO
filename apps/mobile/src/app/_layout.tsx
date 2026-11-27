import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { t } from '@/core/i18n';
import { AppProviders, RouteErrorBoundary, useAppFonts } from '@/core/ui';
import { ContentSyncDriver, DataProvider } from '@/data';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <AppProviders>
      <RouteErrorBoundary {...props} />
    </AppProviders>
  );
}

// Keep the splash screen until the typefaces are ready, so text never re-flows on start.
void SplashScreen.preventAutoHideAsync();

const withHeader = { headerShown: true, headerBackButtonDisplayMode: 'minimal' } as const;

export default function RootLayout() {
  const fontsReady = useAppFonts();

  // Synchronises with an external system (the native splash screen), so an effect is appropriate.
  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <AppProviders>
      <DataProvider>
        <ContentSyncDriver />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(student)" />
          {/* Intro and study draw their own top bars (hero illustration, progress header). */}
          <Stack.Screen name="lesson/[lessonId]/index" />
          <Stack.Screen name="lesson/[lessonId]/study" />
          {/* Practice draws its own progress header. */}
          <Stack.Screen name="practice/session" />
          <Stack.Screen
            name="lesson/[lessonId]/dialogue"
            options={{ ...withHeader, title: t('dialogue.title') }}
          />
          <Stack.Screen
            name="account/invitation"
            options={{ ...withHeader, title: t('account.invitation.title') }}
          />
          <Stack.Screen
            name="account/sign-in"
            options={{ ...withHeader, title: t('account.signInScreen.title') }}
          />
        </Stack>
      </DataProvider>
    </AppProviders>
  );
}
