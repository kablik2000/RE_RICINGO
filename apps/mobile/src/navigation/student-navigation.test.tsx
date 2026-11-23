import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

// Jest's expo-constants mock does not evaluate app.config.ts, so provide the validated config.
jest.mock('@/core/config', () => ({
  getAppConfig: () => ({ appEnv: 'development', appVersion: '0.1.0', contentApiUrl: null }),
}));

/**
 * Integration tests of the real route tree in src/app with the bundled demo lesson.
 */
describe('student navigation shell', () => {
  it('shows the home tab while its content is being designed', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });

    expect(screen).toHavePathname('/');
    expect(await screen.findByText('Úvodní stránka se připravuje')).toBeOnTheScreen();
  });

  it('offers the first lesson and lists lessons on the lessons tab', async () => {
    await renderRouter('./src/app', { initialUrl: '/lessons' });

    expect(await screen.findByRole('button', { name: 'Začít lekci' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^Al bar, V kavárně · 12 vět, A1/ }),
    ).toBeOnTheScreen();
  });

  it.each([
    ['/lessons', 'Další lekce připravuje vaše lektorka. Objeví se tady, jakmile vám je přidělí.'],
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
    await renderRouter('./src/app', { initialUrl: '/lessons' });

    await fireEvent.press(await screen.findByRole('button', { name: 'Začít lekci' }));
    expect(screen).toHavePathname('/lesson/al-bar');
    expect(await screen.findByText('Gramatika v lekci')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Začít rozbor vět' }));
    expect(screen).toHavePathname('/lesson/al-bar/study');
    expect(await screen.findByText('Věta 1 z 12')).toBeOnTheScreen();
    expect(screen.getByText('Dobrý den!')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Předchozí' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Další věta' }));
    expect(await screen.findByText('Věta 2 z 12')).toBeOnTheScreen();
    expect(screen.getByText('Co si přejete?')).toBeOnTheScreen();

    // The first word is analysed; tapping another word shows its analysis instead.
    expect(screen.queryByText(/3\. osobu jednotného čísla/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'desidera' }));
    expect(screen.getByRole('button', { name: 'desidera' })).toBeSelected();
    expect(screen.getByText(/3\. osobu jednotného čísla/)).toBeOnTheScreen();

    // Deeper context stays hidden until requested.
    expect(screen.queryByText(/Zájmeno Lei se nevyslovuje/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Souvislosti' }));
    expect(screen.getByText(/Zájmeno Lei se nevyslovuje/)).toBeOnTheScreen();

    for (let step = 3; step <= 12; step += 1) {
      await fireEvent.press(screen.getByRole('button', { name: 'Další věta' }));
    }
    expect(await screen.findByText('Věta 12 z 12')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Celý dialog' }));
    expect(screen).toHavePathname('/lesson/al-bar/dialogue');
    expect(await screen.findByText('Grazie a Lei, arrivederci!')).toBeOnTheScreen();
  });
});
