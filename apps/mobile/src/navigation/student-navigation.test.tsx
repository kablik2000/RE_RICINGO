import { act, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

// Jest's expo-constants mock does not evaluate app.config.ts, so provide the validated config.
jest.mock('@/core/config', () => ({
  appConfig: { appEnv: 'development', appVersion: '0.1.0' },
}));

/**
 * Integration test of the real route tree in src/app: providers, tab group and screens.
 */
describe('student navigation shell', () => {
  it('opens the lessons tab at the root route', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });

    expect(screen).toHavePathname('/');
    expect(await screen.findByText('Zatím žádné lekce')).toBeOnTheScreen();
  });

  it.each([
    ['/vocabulary', 'Slovník je zatím prázdný'],
    ['/practice', 'Zatím není co procvičovat'],
    ['/profile', 'Verze aplikace'],
  ] as const)('navigates to %s', async (path, expectedText) => {
    await renderRouter('./src/app', { initialUrl: '/' });

    await act(() => {
      router.push(path);
    });

    expect(screen).toHavePathname(path);
    expect(await screen.findByText(expectedText)).toBeOnTheScreen();
  });

  it('shows the not-found screen for unknown routes', async () => {
    await renderRouter('./src/app', { initialUrl: '/does-not-exist' });

    expect(await screen.findByText('Stránka nenalezena')).toBeOnTheScreen();
  });
});
