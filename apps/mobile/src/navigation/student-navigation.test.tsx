import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

// Jest's expo-constants mock does not evaluate app.config.ts, so provide the validated config.
jest.mock('@/core/config', () => ({
  appConfig: { appEnv: 'development', appVersion: '0.1.0' },
}));

/**
 * Integration tests of the real route tree in src/app with the bundled demo lesson.
 */
describe('student navigation shell', () => {
  it('lists the demo lesson on the lessons tab', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });

    expect(screen).toHavePathname('/');
    expect(await screen.findByRole('button', { name: /^Al bar, V kavárně, A1/ })).toBeOnTheScreen();
  });

  it.each([
    ['/vocabulary', 'volere'],
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

  it('shows a not-found error for an unknown lesson', async () => {
    await renderRouter('./src/app', { initialUrl: '/lesson/in-stazione' });

    expect(await screen.findByText('Obsah nenalezen')).toBeOnTheScreen();
  });
});

describe('lesson flow', () => {
  it('goes from the lesson list through the sentence walkthrough to the full dialogue', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });

    await fireEvent.press(await screen.findByRole('button', { name: /^Al bar/ }));
    expect(screen).toHavePathname('/lesson/al-bar');
    expect(await screen.findByText('Cíl lekce')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Začít rozbor vět' }));
    expect(screen).toHavePathname('/lesson/al-bar/study');
    expect(await screen.findByText('Věta 1 z 12')).toBeOnTheScreen();
    expect(screen.getByText('Buongiorno!')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Předchozí' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Další věta' }));
    expect(await screen.findByText('Věta 2 z 12')).toBeOnTheScreen();
    expect(screen.getByText('Cosa desidera?')).toBeOnTheScreen();

    // Deeper explanation layers stay hidden until requested.
    expect(screen.queryByText(/3\. osobu jednotného čísla/)).toBeNull();
    const [, desideraGrammar] = screen.getAllByRole('button', { name: 'Gramatika' });
    if (desideraGrammar === undefined) throw new Error('expected a second grammar toggle');
    await fireEvent.press(desideraGrammar);
    expect(screen.getByText(/3\. osobu jednotného čísla/)).toBeOnTheScreen();

    for (let step = 3; step <= 12; step += 1) {
      await fireEvent.press(screen.getByRole('button', { name: 'Další věta' }));
    }
    expect(await screen.findByText('Věta 12 z 12')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Celý dialog' }));
    expect(screen).toHavePathname('/lesson/al-bar/dialogue');
    expect(await screen.findByText('Grazie a Lei, arrivederci!')).toBeOnTheScreen();
  });
});
