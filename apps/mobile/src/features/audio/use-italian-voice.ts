import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { type ItalianVoiceStatus, voiceAvailability } from './voice-availability';

export const italianVoiceQueryKey = ['device', 'italian-voice'] as const;

export interface ItalianVoice {
  status: ItalianVoiceStatus;
  isChecking: boolean;
  recheck: () => void;
}

/**
 * Status of the device's Italian text-to-speech voice. Re-checked whenever the app returns to the
 * foreground, e.g. after the user downloaded the voice in the system screen.
 */
export function useItalianVoice(): ItalianVoice {
  const query = useQuery({
    queryKey: italianVoiceQueryKey,
    queryFn: () => voiceAvailability.checkItalianVoice(),
    staleTime: Infinity,
  });
  const { refetch } = query;

  // Synchronises with an external system (app foreground state), so an effect is appropriate.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refetch();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [refetch]);

  return {
    status: query.data ?? 'unknown',
    isChecking: query.isFetching,
    recheck: () => {
      void refetch();
    },
  };
}
