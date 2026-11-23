import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createTestServices, lessonBundle } from '@/testing/fake-content-server';
import { renderWithProviders } from '@/testing/render-with-providers';

import { LessonUpdateSettings } from './lesson-update-settings';

describe('LessonUpdateSettings', () => {
  it('selects "Automaticky přes Wi-Fi" by default and saves another choice', async () => {
    const { services } = createTestServices();
    await renderWithProviders(<LessonUpdateSettings />, { services });

    expect(
      await screen.findByRole('radio', { name: 'Automaticky přes Wi-Fi', checked: true }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Vždy se zeptat' }));

    expect(
      await screen.findByRole('radio', { name: 'Vždy se zeptat', checked: true }),
    ).toBeOnTheScreen();
    await expect(services.updateSettings.getPolicy()).resolves.toBe('ask');
  });

  it('offers updates found by a manual check on mobile data and downloads them', async () => {
    const test = createTestServices({ connection: 'metered' });
    test.server.publish(lessonBundle('alla-stazione', 1, 'Alla stazione'));
    await renderWithProviders(<LessonUpdateSettings />, { services: test.services });

    await fireEvent.press(screen.getByRole('button', { name: 'Zkontrolovat aktualizace' }));

    expect(await screen.findByText('Nové lekce k dispozici')).toBeOnTheScreen();
    expect(screen.getByText('1 nová lekce')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Stáhnout' }));

    await waitFor(() => {
      expect(screen.queryByText('Nové lekce k dispozici')).toBeNull();
    });
    expect(await test.library.listLessons()).toHaveLength(2);
    expect(screen.getByText(/Všechny lekce jsou aktuální\./)).toBeOnTheScreen();
  });

  it('tells the student what an automatic update changed until they confirm it', async () => {
    const test = createTestServices({ connection: 'unmetered' });
    test.server.publish(lessonBundle('alla-stazione', 1, 'Alla stazione'));
    test.server.unpublish('al-bar');
    await renderWithProviders(<LessonUpdateSettings />, { services: test.services });

    await fireEvent.press(screen.getByRole('button', { name: 'Zkontrolovat aktualizace' }));

    expect(await screen.findByText('Lekce jsou aktualizované')).toBeOnTheScreen();
    expect(screen.getByText('Nové: Alla stazione')).toBeOnTheScreen();
    expect(screen.getByText('Odebrané: Al bar')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => {
      expect(screen.queryByText('Lekce jsou aktualizované')).toBeNull();
    });
  });

  it('shows why a manual check failed', async () => {
    const test = createTestServices({ connection: 'offline' });
    await renderWithProviders(<LessonUpdateSettings />, { services: test.services });

    await fireEvent.press(screen.getByRole('button', { name: 'Zkontrolovat aktualizace' }));

    expect(
      await screen.findByText('Zkontrolujte připojení k internetu a zkuste to znovu.'),
    ).toBeOnTheScreen();
  });
});
