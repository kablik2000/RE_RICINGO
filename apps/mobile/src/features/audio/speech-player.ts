import * as Speech from 'expo-speech';

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

const ITALIAN = 'it-IT';
const RATES: Readonly<Record<PlaybackSpeed, number>> = { normal: 0.95, slow: 0.6 };

function report(error: unknown) {
  telemetry.captureError(toAppError(error), { source: 'speech-player' });
}

/** Stops whatever is playing, then speaks the given texts in order. */
function restartWith(texts: readonly string[], speed: PlaybackSpeed) {
  Speech.stop()
    .then(() => {
      for (const text of texts) {
        Speech.speak(text, { language: ITALIAN, rate: RATES[speed], onError: report });
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
