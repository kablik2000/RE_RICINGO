import * as Speech from 'expo-speech';

import { telemetry } from '@/core/telemetry';

import { ITALIAN_TEST_VOICE } from '../../../jest.setup';
import { createVoiceAvailability, isItalianLanguageTag } from './voice-availability';

const { checkItalianVoice } = createVoiceAvailability('ios', null);

const ENGLISH_VOICE: Speech.Voice = {
  ...ITALIAN_TEST_VOICE,
  identifier: 'en-us-test',
  language: 'en-US',
};

describe('isItalianLanguageTag', () => {
  it.each(['it', 'it-IT', 'it_IT', 'IT-ch'])('accepts %s', (tag) => {
    expect(isItalianLanguageTag(tag)).toBe(true);
  });

  it.each(['en-US', 'ita', 'fr-IT', ''])('rejects %s', (tag) => {
    expect(isItalianLanguageTag(tag)).toBe(false);
  });
});

describe('checkItalianVoice (iOS and web: voices from expo-speech)', () => {
  it('is available when the device lists an Italian voice', async () => {
    jest
      .mocked(Speech.getAvailableVoicesAsync)
      .mockResolvedValue([ENGLISH_VOICE, ITALIAN_TEST_VOICE]);

    await expect(checkItalianVoice()).resolves.toBe('available');
  });

  it('is missing when only other languages are installed', async () => {
    jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([ENGLISH_VOICE]);

    await expect(checkItalianVoice()).resolves.toBe('missing');
  });

  it('is unknown while the voice list is empty (browsers load it lazily)', async () => {
    jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([]);

    await expect(checkItalianVoice()).resolves.toBe('unknown');
  });

  it('reports a failed check and treats the voice as unknown', async () => {
    const captureError = jest.spyOn(telemetry, 'captureError').mockImplementation(() => undefined);
    jest.mocked(Speech.getAvailableVoicesAsync).mockRejectedValue(new Error('engine crashed'));

    await expect(checkItalianVoice()).resolves.toBe('unknown');
    expect(captureError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'unexpected' }), {
      source: 'voice-availability',
    });
  });
});

describe('checkItalianVoice (Android: native module)', () => {
  const onAndroid = (native: Parameters<typeof createVoiceAvailability>[1]) =>
    createVoiceAvailability('android', native);

  it.each([
    ['available', 'available'],
    ['missingData', 'missing'],
    ['notSupported', 'missing'],
    ['noEngine', 'missing'],
  ] as const)('maps native status %s to %s', async (nativeStatus, expected) => {
    const voiceData = onAndroid({
      getLanguageStatus: jest.fn().mockResolvedValue(nativeStatus),
      openVoiceDataInstaller: jest.fn(),
    });

    await expect(voiceData.checkItalianVoice()).resolves.toBe(expected);
    expect(voiceData.canOpenVoiceInstaller).toBe(true);
  });

  it('asks the engine for "it" and opens its installer', async () => {
    const native = {
      getLanguageStatus: jest.fn().mockResolvedValue('available'),
      openVoiceDataInstaller: jest.fn().mockResolvedValue(true),
    };
    const voiceData = onAndroid(native);

    await voiceData.checkItalianVoice();
    await expect(voiceData.openVoiceInstaller()).resolves.toBe(true);
    expect(native.getLanguageStatus).toHaveBeenCalledWith('it');
    expect(native.openVoiceDataInstaller).toHaveBeenCalledTimes(1);
  });

  it('is unknown without the native module (Expo Go) and cannot open an installer', async () => {
    const voiceData = onAndroid(null);

    await expect(voiceData.checkItalianVoice()).resolves.toBe('unknown');
    expect(voiceData.canOpenVoiceInstaller).toBe(false);
    await expect(voiceData.openVoiceInstaller()).resolves.toBe(false);
  });
});
