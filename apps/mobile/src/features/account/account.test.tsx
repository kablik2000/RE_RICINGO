import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type * as ExpoRouter from 'expo-router';

import { AccountError, type AccountApi } from '@/data/account/account-api';
import { createTestServices } from '@/testing/fake-content-server';
import { renderWithProviders } from '@/testing/render-with-providers';

import { AccountSection } from './components/account-section';
import { AcceptInvitationScreen } from './screens/accept-invitation-screen';
import { SignInScreen } from './screens/sign-in-screen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof ExpoRouter>('expo-router'),
  useRouter: () => mockRouter,
}));

const STUDENT = { id: 's1', email: 'marie@example.test', displayName: 'Marie Nováková' };
const SIGNED_IN = { token: 'tok-1', student: STUDENT };
const PHONE = {
  id: 'd1',
  name: 'Pixel',
  signedInAt: '',
  lastSeenAt: '2026-11-20T10:00:00Z',
  current: true,
};
const TABLET = {
  id: 'd2',
  name: 'Tablet',
  signedInAt: '',
  lastSeenAt: '2026-11-18T10:00:00Z',
  current: false,
};
const DEVICES = [PHONE, TABLET];

/** Every method is a jest.fn, so tests can assert calls; overrides replace single methods. */
function fakeAccountApi(overrides: Partial<AccountApi> = {}): AccountApi {
  const api: AccountApi = {
    acceptInvitation: jest.fn(() => Promise.resolve(SIGNED_IN)),
    signIn: jest.fn(() => Promise.resolve(SIGNED_IN)),
    me: jest.fn(() => Promise.resolve({ student: STUDENT, devices: DEVICES, maxDevices: 3 })),
    signOut: jest.fn(() => Promise.resolve()),
    removeDevice: jest.fn(() => Promise.resolve()),
    recommendations: jest.fn(() => Promise.resolve([])),
  };
  return { ...api, ...overrides };
}

beforeEach(() => {
  mockRouter.back.mockClear();
  mockRouter.push.mockClear();
});

describe('AccountSection', () => {
  it('offers the invitation and sign-in to somebody without an account', async () => {
    const { services } = createTestServices({ account: fakeAccountApi() });
    await renderWithProviders(<AccountSection />, { services });

    await fireEvent.press(await screen.findByRole('button', { name: 'Mám pozvánku' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/account/invitation');
    await fireEvent.press(screen.getByRole('button', { name: 'Přihlásit se' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/account/sign-in');
  });

  it('shows the signed-in student, removes another device and signs out', async () => {
    const account = fakeAccountApi();
    const test = createTestServices({ account });
    await test.tokens.write('tok-1');
    await renderWithProviders(<AccountSection />, { services: test.services });

    expect(await screen.findByText('Přihlášeni jako Marie Nováková')).toBeOnTheScreen();
    expect(screen.getByText('Moje zařízení · 2 z 3')).toBeOnTheScreen();
    expect(screen.getByText('Toto zařízení')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Odhlásit' }));
    await waitFor(() => {
      expect(account.removeDevice).toHaveBeenCalledWith('tok-1', 'd2');
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Odhlásit se' }));
    expect(await screen.findByRole('button', { name: 'Mám pozvánku' })).toBeOnTheScreen();
    expect(account.signOut).toHaveBeenCalledWith('tok-1');
    await expect(test.tokens.read()).resolves.toBeNull();
  });

  it('forgets a session the server ended', async () => {
    const account = fakeAccountApi({
      me: jest.fn(() => Promise.reject(new AccountError('unauthorized', 'Ended.'))),
    });
    const test = createTestServices({ account });
    await test.tokens.write('old');
    await renderWithProviders(<AccountSection />, { services: test.services });

    expect(await screen.findByRole('button', { name: 'Mám pozvánku' })).toBeOnTheScreen();
    await expect(test.tokens.read()).resolves.toBeNull();
  });
});

describe('AcceptInvitationScreen', () => {
  it('checks the repeated password, then creates the account', async () => {
    const account = fakeAccountApi();
    const test = createTestServices({ account });
    await renderWithProviders(<AcceptInvitationScreen />, { services: test.services });

    await fireEvent.changeText(screen.getByLabelText('Kód pozvánky'), '8cmt-gy2g-a13v');
    await fireEvent.changeText(screen.getByLabelText('Heslo'), 'heslo-studenta-1');
    await fireEvent.changeText(screen.getByLabelText('Heslo znovu'), 'jine-heslo');
    await fireEvent.press(screen.getByRole('button', { name: 'Vytvořit účet' }));
    expect(screen.getByText('Hesla se neshodují.')).toBeOnTheScreen();
    expect(account.acceptInvitation).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Heslo znovu'), 'heslo-studenta-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Vytvořit účet' }));

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalled();
    });
    expect(account.acceptInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ code: '8cmt-gy2g-a13v', password: 'heslo-studenta-1' }),
    );
    await expect(test.tokens.read()).resolves.toBe('tok-1');
    // Recommended lessons download right away.
    await waitFor(() => {
      expect(test.server.api.fetchCatalog).toHaveBeenCalled();
    });
  });

  it('explains a code that does not work', async () => {
    const account = fakeAccountApi({
      acceptInvitation: jest.fn(() =>
        Promise.reject(new AccountError('invalid_invitation', 'Unknown code.')),
      ),
    });
    await renderWithProviders(<AcceptInvitationScreen />, {
      services: createTestServices({ account }).services,
    });

    await fireEvent.changeText(screen.getByLabelText('Kód pozvánky'), 'XXXX');
    await fireEvent.changeText(screen.getByLabelText('Heslo'), 'heslo-studenta-1');
    await fireEvent.changeText(screen.getByLabelText('Heslo znovu'), 'heslo-studenta-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Vytvořit účet' }));

    expect(
      await screen.findByText(
        'Kód neplatí. Zkontrolujte ho, nebo požádejte lektorku o novou pozvánku.',
      ),
    ).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe('SignInScreen', () => {
  it('lets the student sign out one of three devices to sign in here', async () => {
    const limit = new AccountError('device_limit', 'Too many.', [
      TABLET,
      { id: 'd3', name: 'Notebook', signedInAt: '', lastSeenAt: '', current: false },
    ]);
    const account = fakeAccountApi({
      signIn: jest.fn().mockRejectedValueOnce(limit).mockResolvedValueOnce(SIGNED_IN),
    });
    await renderWithProviders(<SignInScreen />, {
      services: createTestServices({ account }).services,
    });

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'marie@example.test');
    await fireEvent.changeText(screen.getByLabelText('Heslo'), 'heslo-studenta-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Přihlásit se' }));
    expect(await screen.findByText('Jste přihlášeni na 3 zařízeních')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Odhlásit Notebook' }));

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalled();
    });
    expect(account.signIn).toHaveBeenLastCalledWith(
      expect.objectContaining({ email: 'marie@example.test', replaceDeviceId: 'd3' }),
    );
  });

  it('says when the e-mail or password is wrong', async () => {
    const account = fakeAccountApi({
      signIn: jest.fn(() => Promise.reject(new AccountError('invalid_credentials', 'Wrong.'))),
    });
    await renderWithProviders(<SignInScreen />, {
      services: createTestServices({ account }).services,
    });

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'marie@example.test');
    await fireEvent.changeText(screen.getByLabelText('Heslo'), 'spatne');
    await fireEvent.press(screen.getByRole('button', { name: 'Přihlásit se' }));

    expect(await screen.findByText('Nesprávný e-mail nebo heslo.')).toBeOnTheScreen();
  });
});
