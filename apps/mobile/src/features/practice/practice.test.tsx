import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

jest.mock('@/core/config', () => ({
  getAppConfig: () => ({ appEnv: 'development', appVersion: '0.1.0', contentApiUrl: null }),
}));

/** Integration tests of practice (ADR-0017) on the real routes with the bundled demo lesson. */
describe('practice', () => {
  it('shows what is due across lessons and lesson by lesson', async () => {
    await renderRouter('./src/app', { initialUrl: '/practice' });

    expect(await screen.findByText('21 slovíček k procvičení')).toBeOnTheScreen();
    expect(screen.getByText('Dialogy')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Podle lekcí'));

    expect(screen.getByText('Gramatické okruhy')).toBeOnTheScreen();
    expect(screen.getByText('Neurčitý člen')).toBeOnTheScreen();
  });

  it('checks an answer, shows the solution and ends with a summary', async () => {
    await renderRouter('./src/app', { initialUrl: '/practice' });
    await screen.findByText('Opakování slovíček');
    await act(() => {
      router.push({
        pathname: '/practice/session',
        params: { kind: 'grammar', lessonId: 'al-bar', topicId: 'conditional-vorrei' },
      });
    });

    expect(await screen.findByText('Doplňte správné slovo')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Zkontrolovat' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Vorrei' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Zkontrolovat' }));

    expect(await screen.findByText('Správně!')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Dokončit' }));

    expect(await screen.findByText('1 z 1 správně')).toBeOnTheScreen();
  });

  it('builds a sentence from tiles', async () => {
    await renderRouter('./src/app', { initialUrl: '/practice' });
    await screen.findByText('Opakování slovíček');
    await act(() => {
      router.push({ pathname: '/practice/session', params: { kind: 'translation' } });
    });

    expect(await screen.findByText('Složte větu italsky')).toBeOnTheScreen();
    expect(screen.getByText('Ťukněte na dílky ve správném pořadí')).toBeOnTheScreen();
  });

  it('shows not found for an unknown kind of practice', async () => {
    await renderRouter('./src/app', { initialUrl: '/practice/session?kind=singing' });

    expect(await screen.findByText('Stránka nenalezena')).toBeOnTheScreen();
  });
});
