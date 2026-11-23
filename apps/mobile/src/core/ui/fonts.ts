import { NotoSerif_400Regular } from '@expo-google-fonts/noto-serif/400Regular';
import { NotoSerif_400Regular_Italic } from '@expo-google-fonts/noto-serif/400Regular_Italic';
import { NotoSerif_600SemiBold } from '@expo-google-fonts/noto-serif/600SemiBold';
import { Roboto_400Regular } from '@expo-google-fonts/roboto/400Regular';
import { Roboto_500Medium } from '@expo-google-fonts/roboto/500Medium';
import { Roboto_700Bold } from '@expo-google-fonts/roboto/700Bold';
import { type FontFamilyName } from '@ricingo/design-system';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';

import { toAppError } from '@/core/errors';
import { telemetry } from '@/core/telemetry';

/** Font files for every family the design system's typography uses (keys must match). */
export const appFonts = {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  NotoSerif_400Regular,
  NotoSerif_400Regular_Italic,
  NotoSerif_600SemiBold,
} as const satisfies Record<FontFamilyName, number>;

/**
 * Loads the app typefaces. Resolves to true once the UI may render: when the fonts are loaded or
 * when loading failed (then the platform font is used and the failure is reported).
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(appFonts);

  // Synchronises with an external system (error reporting), so an effect is appropriate.
  useEffect(() => {
    if (error !== null) {
      telemetry.captureError(toAppError(error), { source: 'fonts' });
    }
  }, [error]);

  return loaded || error !== null;
}
