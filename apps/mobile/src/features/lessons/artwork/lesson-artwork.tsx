import { useTheme } from '@ricingo/design-system';
import type { ComponentType } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg from 'react-native-svg';

import { BookScene, CafeScene, type SceneProps } from './scenes';

/**
 * Artwork per lesson. DEMO: keyed by lesson id in code; moves into lesson content (an artwork key
 * chosen in Teacher Studio) with the content pipeline (M3).
 */
const scenesByLesson: Readonly<Record<string, ComponentType<SceneProps>>> = {
  'al-bar': CafeScene,
};

export type LessonArtworkVariant = 'hero' | 'banner' | 'thumbnail';

export interface LessonArtworkProps {
  lessonId: string;
  /**
   * `hero`: the whole scene at full width, resting on the bottom edge (tall areas);
   * `banner`: fills a wide area, cropping the top; `thumbnail`: the main object only.
   */
  variant: LessonArtworkVariant;
  style?: StyleProp<ViewStyle>;
}

const viewBoxes: Readonly<Record<LessonArtworkVariant, string>> = {
  hero: '-10 0 340 166',
  banner: '0 0 320 162',
  thumbnail: '70 34 180 132',
};

const aspectRatios: Readonly<Record<LessonArtworkVariant, string>> = {
  hero: 'xMidYMax meet',
  banner: 'xMidYMax slice',
  thumbnail: 'xMidYMid meet',
};

/** Decorative lesson illustration on its backdrop colour; hidden from screen readers. */
export function LessonArtwork({ lessonId, variant, style }: LessonArtworkProps) {
  const theme = useTheme();
  const Scene = scenesByLesson[lessonId] ?? BookScene;
  return (
    <View
      style={[{ backgroundColor: theme.illustration.backdrop, overflow: 'hidden' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg
        width="100%"
        height="100%"
        viewBox={viewBoxes[variant]}
        preserveAspectRatio={aspectRatios[variant]}>
        <Scene colors={theme.illustration} />
      </Svg>
    </View>
  );
}
