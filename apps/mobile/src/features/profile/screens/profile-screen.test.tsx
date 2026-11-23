import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/testing/render-with-providers';

import { ProfileScreen } from './profile-screen';

describe('ProfileScreen', () => {
  it('shows version and environment outside production', async () => {
    await renderWithProviders(
      <ProfileScreen config={{ appEnv: 'preview', appVersion: '0.1.0', contentApiUrl: null }} />,
    );

    expect(screen.getByLabelText('Verze aplikace: 0.1.0')).toBeOnTheScreen();
    expect(screen.getByLabelText('Prostředí: Testovací')).toBeOnTheScreen();
  });

  it('hides the environment in production', async () => {
    await renderWithProviders(
      <ProfileScreen config={{ appEnv: 'production', appVersion: '1.0.0', contentApiUrl: null }} />,
    );

    expect(screen.getByLabelText('Verze aplikace: 1.0.0')).toBeOnTheScreen();
    expect(screen.queryByText('Prostředí')).toBeNull();
  });
});
