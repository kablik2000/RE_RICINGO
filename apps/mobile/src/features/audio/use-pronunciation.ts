import { useEffect } from 'react';

import { speechPlayer, type SpeechPlayer } from './speech-player';

/** Pronunciation player whose playback stops when the screen using it unmounts. */
export function usePronunciation(): SpeechPlayer {
  // Synchronises with an external system (the audio output), so an effect is appropriate.
  useEffect(
    () => () => {
      speechPlayer.stop();
    },
    [],
  );
  return speechPlayer;
}
