import { requireOptionalNativeModule } from 'expo';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { toAppError } from '@/core/errors';
import { telemetry } from '@/core/telemetry';

/**
 * Whether the device can pronounce Italian with its text-to-speech voice. DEMO concern: recorded
 * or cloud-generated audio (Q-3) does not depend on the device.
 *
 * `unknown` means the check is not possible (Expo Go, web before voices load, an error); playback
 * then stays enabled.
 */
export type ItalianVoiceStatus = 'available' | 'missing' | 'unknown';

type NativeLanguageStatus = 'available' | 'missingData' | 'notSupported' | 'noEngine';

/** Local native module `modules/tts-voice-data` (Android only; absent in Expo Go). */
export interface TtsVoiceDataModule {
  getLanguageStatus(languageTag: string): Promise<NativeLanguageStatus>;
  openVoiceDataInstaller(): Promise<boolean>;
}

export interface VoiceAvailability {
  checkItalianVoice(): Promise<ItalianVoiceStatus>;
  /** True where the app can open the system's voice download in one tap (Android builds, not Expo Go). */
  readonly canOpenVoiceInstaller: boolean;
  /** Opens the engine's voice download screen (or TTS settings); false when the device has neither. */
  openVoiceInstaller(): Promise<boolean>;
}

/** BCP-47 language tag of a voice is Italian ("it", "it-IT", "it_IT"…). */
export function isItalianLanguageTag(tag: string): boolean {
  return /^it(?:[-_]|$)/i.test(tag);
}

export function createVoiceAvailability(
  os: typeof Platform.OS,
  voiceData: TtsVoiceDataModule | null,
): VoiceAvailability {
  async function readStatus(): Promise<ItalianVoiceStatus> {
    if (os === 'android') {
      // expo-speech also lists Android voices that are not downloaded, so only the native module can tell.
      if (voiceData === null) {
        return 'unknown';
      }
      return (await voiceData.getLanguageStatus('it')) === 'available' ? 'available' : 'missing';
    }
    const voices = await Speech.getAvailableVoicesAsync();
    // Browsers load voices lazily: an empty list does not mean "no Italian voice".
    if (voices.length === 0) {
      return 'unknown';
    }
    return voices.some((voice) => isItalianLanguageTag(voice.language)) ? 'available' : 'missing';
  }

  return {
    async checkItalianVoice() {
      try {
        return await readStatus();
      } catch (error) {
        telemetry.captureError(toAppError(error), { source: 'voice-availability' });
        return 'unknown';
      }
    },
    canOpenVoiceInstaller: voiceData !== null,
    async openVoiceInstaller() {
      return voiceData === null ? false : voiceData.openVoiceDataInstaller();
    },
  };
}

export const voiceAvailability = createVoiceAvailability(
  Platform.OS,
  Platform.OS === 'android'
    ? requireOptionalNativeModule<TtsVoiceDataModule>('TtsVoiceData')
    : null,
);
