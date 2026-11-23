import type { IllustrationColors } from '@ricingo/design-system';
import { Circle, Ellipse, G, Path } from 'react-native-svg';

/**
 * Lesson scenes, drawn on a 320 × 162 canvas from the theme's illustration colours only.
 * Every scene keeps its main object around the centre so the thumbnail crop (see
 * `lesson-artwork.tsx`) still shows it.
 */
export interface SceneProps {
  colors: IllustrationColors;
}

/** "Al bar": a cappuccino and a cornetto on the bar counter. */
export function CafeScene({ colors }: SceneProps) {
  return (
    <G>
      <Circle cx={160} cy={98} r={78} fill={colors.halo} />
      <Circle cx={292} cy={30} r={11} fill={colors.highlight} opacity={0.7} />
      <Circle cx={34} cy={52} r={7} fill={colors.highlight} opacity={0.7} />
      <Path d="M-40 146 h400 v20 h-400 z" fill={colors.counter} />
      <Path d="M-40 143 h400 v5 h-400 z" fill={colors.counterEdge} />
      <Ellipse cx={150} cy={146} rx={72} ry={11} fill={colors.porcelain} />
      <Path
        d="M98 84 h104 v22 a52 50 0 0 1 -52 36 a52 50 0 0 1 -52 -36 z"
        fill={colors.porcelain}
      />
      <Path
        d="M202 94 a17 17 0 0 1 0 34"
        fill="none"
        stroke={colors.porcelain}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <Ellipse cx={150} cy={84} rx={52} ry={10} fill={colors.espresso} />
      <Ellipse cx={150} cy={84} rx={40} ry={6.5} fill={colors.crema} />
      <Path d="M100 104 h100" stroke={colors.accent} strokeWidth={6} />
      <Path
        d="M134 66 c-9 -10 9 -17 0 -30 M152 62 c-9 -10 9 -17 0 -30 M170 66 c-9 -10 9 -17 0 -30"
        fill="none"
        stroke={colors.steam}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Path d="M222 146 q28 -46 66 0 q-12 -9 -33 -9 q-21 0 -33 9 z" fill={colors.pastry} />
      <Path
        d="M240 134 l6 -14 M255 131 v-16 M270 134 l-6 -14"
        stroke={colors.pastryShade}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </G>
  );
}

/** Fallback for lessons without their own artwork: an open book. */
export function BookScene({ colors }: SceneProps) {
  return (
    <G>
      <Circle cx={160} cy={92} r={72} fill={colors.halo} />
      <Circle cx={292} cy={30} r={11} fill={colors.highlight} opacity={0.7} />
      <Path d="M-40 146 h400 v20 h-400 z" fill={colors.counter} />
      <Path d="M160 66 c-26 -12 -54 -12 -76 -4 v76 c22 -8 50 -8 76 4 z" fill={colors.porcelain} />
      <Path d="M160 66 c26 -12 54 -12 76 -4 v76 c-22 -8 -50 -8 -76 4 z" fill={colors.porcelain} />
      <Path d="M160 66 v76" stroke={colors.accent} strokeWidth={4} strokeLinecap="round" />
      <Path
        d="M98 82 c16 -4 32 -4 48 2 M98 98 c16 -4 32 -4 48 2 M98 114 c16 -4 32 -4 48 2 M174 84 c16 -6 32 -6 48 -2 M174 100 c16 -6 32 -6 48 -2"
        fill="none"
        stroke={colors.steam}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </G>
  );
}
