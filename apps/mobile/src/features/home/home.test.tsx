import { fireEvent, screen } from '@testing-library/react-native';
import type * as ExpoRouter from 'expo-router';

import { AppError } from '@/core/errors';
import type { AccountApi, Recommendation } from '@/data/account/account-api';
import { createTestServices } from '@/testing/fake-content-server';
import { renderWithProviders } from '@/testing/render-with-providers';

import { HomeScreen } from './screens/home-screen';

const mockRouter = { back: jest.fn(), push: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof ExpoRouter>('expo-router'),
  useRouter: () => mockRouter,
}));

const LESSON = { id: 'al-bar', titleItalian: 'Al bar', titleCzech: 'V kavárně', level: 'A1' };
const WORDS: Recommendation = {
  id: 'r1',
  kind: 'vocabulary',
  teacherName: 'Rita',
  lesson: LESSON,
  grammarTopic: null,
  words: [
    { id: 'volere', lemma: 'volere', translation: 'chtít' },
    { id: 'pizza', lemma: 'pizza', translation: 'pizza' },
  ],
  note: 'Na příště',
  createdAt: '2026-11-27T08:00:00Z',
};
const TOPIC: Recommendation = {
  ...WORDS,
  id: 'r2',
  kind: 'practice',
  grammarTopic: { id: 'conditional-vorrei', title: 'Vorrei' },
  words: [],
  note: null,
};

function accountApi(recommendations: AccountApi['recommendations']): AccountApi {
  return {
    acceptInvitation: jest.fn(),
    signIn: jest.fn(),
    me: jest.fn(),
    signOut: jest.fn(),
    removeDevice: jest.fn(),
    recommendations,
  };
}

beforeEach(() => {
  mockRouter.push.mockClear();
  mockRouter.navigate.mockClear();
});

describe('HomeScreen', () => {
  it('offers the lesson collection by theme, level and as a whole, and lessons to start', async () => {
    const { services } = createTestServices();
    await renderWithProviders(<HomeScreen />, { services });

    await fireEvent.press(await screen.findByRole('button', { name: 'Procházet sbírku lekcí' }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/lessons');

    await fireEvent.press(screen.getByRole('button', { name: 'Tematické okruhy, Jídlo a pití' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/browse', params: { by: 'theme' } });
    expect(screen.getByRole('button', { name: 'Úrovně, A1' })).toBeOnTheScreen();
    expect(screen.getByText('Doporučujeme začít')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Al bar, V kavárně, úroveň A1' })).toBeOnTheScreen();
    expect(screen.queryByText('Od vaší lektorky')).not.toBeOnTheScreen();
  });

  it("shows the lecturer's recommendations and opens practice of the chosen words", async () => {
    const { services } = createTestServices({
      account: accountApi(jest.fn(() => Promise.resolve([WORDS, TOPIC]))),
    });
    await services.tokens.write('tok-1');
    await renderWithProviders(<HomeScreen />, { services });

    expect(await screen.findByText('Od vaší lektorky')).toBeOnTheScreen();
    expect(screen.getByText('„Na příště“')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /^Procvičit 2 slovíčka/ }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/session',
      params: { kind: 'vocabulary', lessonId: 'al-bar', words: 'volere,pizza' },
    });

    await fireEvent.press(screen.getByRole('button', { name: /^Procvičit: Vorrei/ }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/practice/session',
      params: { kind: 'grammar', lessonId: 'al-bar', topicId: 'conditional-vorrei' },
    });
  });

  it('shows the last recommendations received when offline', async () => {
    const { services } = createTestServices({
      account: accountApi(jest.fn(() => Promise.reject(new AppError('network', 'offline')))),
    });
    await services.tokens.write('tok-1');
    await services.recommendationCache.write([TOPIC]);
    await renderWithProviders(<HomeScreen />, { services });

    expect(await screen.findByText('Procvičit: Vorrei')).toBeOnTheScreen();
  });
});
