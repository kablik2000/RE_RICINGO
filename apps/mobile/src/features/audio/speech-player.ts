import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { toAppError } from '@/core/errors';
import { telemetry } from '@/core/telemetry';

export type PlaybackSpeed = 'normal' | 'slow';

/**
 * Pronunciation playback. DEMO implementation: the device's Italian text-to-speech voice.
 * Recorded or lecturer-approved audio replaces it in M3 (open question Q-3) behind this interface.
 */
export interface SpeechPlayer {
  play(text: string, speed: PlaybackSpeed): void;
  /** Plays texts one after another (whole dialogue). */
  playSequence(texts: readonly string[]): void;
  stop(): void;
}

/**
 * Android's expo-speech builds a Java locale from the language *subtag* and treats "it-IT" as
 * ill-formed, silently speaking in the device language instead. iOS and web expect a full tag.
 */
export const SPEECH_LANGUAGE = Platform.OS === 'android' ? 'it' : 'it-IT';
const RATES: Readonly<Record<PlaybackSpeed, number>> = { normal: 0.95, slow: 0.6 };

function report(error: unknown) {
  telemetry.captureError(toAppError(error), { source: 'speech-player' });
}

/** Stops whatever is playing, then speaks the given texts in order. */
function restartWith(texts: readonly string[], speed: PlaybackSpeed) {
  Speech.stop()
    .then(() => {
      for (const text of texts) {
        Speech.speak(text, { language: SPEECH_LANGUAGE, rate: RATES[speed], onError: report });
      }
    })
    .catch(report);
}

export const speechPlayer: SpeechPlayer = {
  play(text, speed) {
    restartWith([text], speed);
  },
  playSequence(texts) {
    restartWith(texts, 'normal');
  },
  stop() {
    Speech.stop().catch(report);
  },
};
