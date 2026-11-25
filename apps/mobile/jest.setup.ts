import * as Speech from 'expo-speech';

import type * as WebTokenStore from '@/data/account/token-store.web';
import type * as WebLocalStore from '@/data/local/open-local-store.web';

/** Device text-to-speech in tests: an Italian voice is installed unless a test says otherwise. */
export const ITALIAN_TEST_VOICE: Speech.Voice = {
  identifier: 'it-it-test',
  name: 'Italiano (test)',
  quality: Speech.VoiceQuality.Default,
  language: 'it-IT',
};

/** No native SQLite in Jest: the offline store lives in memory, as in web previews. */
jest.mock('@/data/account/token-store', () =>
  jest.requireActual<typeof WebTokenStore>('@/data/account/token-store.web'),
);
jest.mock('@/data/local/open-local-store', () =>
  jest.requireActual<typeof WebLocalStore>('@/data/local/open-local-store.web'),
);

jest.mock('expo-speech', () => ({
  ...jest.requireActual<typeof Speech>('expo-speech'),
  getAvailableVoicesAsync: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([ITALIAN_TEST_VOICE]);
});
