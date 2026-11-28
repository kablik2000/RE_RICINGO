import {
  type IllustrationColors,
  type Theme,
  useTheme,
  useThemedStyles,
} from '@ricingo/design-system';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { Greeting } from '@/core/ui';

/** Home header: the greeting over a Roman skyline with a cappuccino (decorative). */
export function HomeHero() {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  return (
    <View style={styles.hero}>
      <View
        style={styles.layer}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {/* Hills across the whole width; the scene keeps its size on the right on wide screens. */}
        <Svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="none">
          <Hills colors={theme.illustration} />
        </Svg>
        <View style={styles.scene}>
          <Svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="xMaxYMax meet">
            <RomeScene colors={theme.illustration} />
          </Svg>
        </View>
      </View>
      <Greeting />
    </View>
  );
}

const ARCH_XS = [212, 236, 260, 284, 308, 332];

/** Rolling hills that fade into the page (stretched to any width). */
function Hills({ colors }: { colors: IllustrationColors }) {
  return (
    <G>
      <Defs>
        {/* The hills fade into the page instead of ending in an edge. */}
        <LinearGradient id="hills" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.3" stopColor={colors.halo} stopOpacity={0.75} />
          <Stop offset="1" stopColor={colors.halo} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path
        d="M0 150 C40 126 80 122 120 134 C160 110 220 106 280 120 C310 112 340 112 360 116 V170 H0 Z"
        fill="url(#hills)"
      />
    </G>
  );
}

/** The Colosseum, cypresses and a cup on its saucer, from the illustration colours only. */
function RomeScene({ colors }: { colors: IllustrationColors }) {
  return (
    <G>
      <Circle cx={330} cy={34} r={9} fill={colors.highlight} opacity={0.8} />
      {/* Colosseum: three tiers of arches, the top one broken off on the left. */}
      <Path d="M196 150 V70 Q260 52 352 62 V150 Z" fill={colors.backdrop} />
      <Path d="M196 150 V96 H352 V150 Z" fill={colors.backdrop} />
      <Path
        d="M196 70 Q260 52 352 62"
        fill="none"
        stroke={colors.counter}
        strokeWidth={3}
        opacity={0.6}
      />
      <Path d="M196 96 H352 M196 122 H352" stroke={colors.counter} strokeWidth={2} opacity={0.5} />
      {ARCH_XS.map((x) => (
        <G key={x}>
          <Path
            d={`M${String(x)} 150 v-16 a7 7 0 0 1 14 0 v16 z`}
            fill={colors.counter}
            opacity={0.55}
          />
          <Path
            d={`M${String(x)} 120 v-14 a7 7 0 0 1 14 0 v14 z`}
            fill={colors.counter}
            opacity={0.45}
          />
          {x > 220 && (
            <Path
              d={`M${String(x + 2)} 92 v-12 a5 5 0 0 1 10 0 v12 z`}
              fill={colors.counter}
              opacity={0.35}
            />
          )}
        </G>
      ))}
      {/* Two cypresses. */}
      <Path d="M177 150 V136 h3 V150 z" fill={colors.counterEdge} />
      <Ellipse cx={178.5} cy={116} rx={7} ry={24} fill={colors.pastryShade} opacity={0.5} />
      <Path d="M190 150 V140 h3 V150 z" fill={colors.counterEdge} />
      <Ellipse cx={191.5} cy={126} rx={5} ry={16} fill={colors.pastryShade} opacity={0.4} />
      {/* Cappuccino on its saucer. */}
      <Ellipse
        cx={100}
        cy={152}
        rx={62}
        ry={10}
        fill={colors.porcelain}
        stroke={colors.steam}
        strokeWidth={1.2}
      />
      <Path
        d="M56 112 h88 v14 a44 40 0 0 1 -44 26 a44 40 0 0 1 -44 -26 z"
        fill={colors.porcelain}
        stroke={colors.steam}
        strokeWidth={1.2}
      />
      <Path
        d="M144 120 a14 14 0 0 1 0 28"
        fill="none"
        stroke={colors.steam}
        strokeWidth={10.4}
        strokeLinecap="round"
      />
      <Path
        d="M144 120 a14 14 0 0 1 0 28"
        fill="none"
        stroke={colors.porcelain}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Ellipse cx={100} cy={112} rx={44} ry={8.5} fill={colors.espresso} />
      <Ellipse cx={100} cy={112} rx={34} ry={5.5} fill={colors.crema} />
      <Path d="M58 128 h84" stroke={colors.accent} strokeWidth={5} />
      <Path
        d="M88 96 c-7 -8 7 -13 0 -23 M104 92 c-7 -8 7 -13 0 -23"
        fill="none"
        stroke={colors.steam}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </G>
  );
}

const ART_HEIGHT = 170;
/** On wider screens the scene keeps the size it has on a phone. */
const SCENE_MAX_WIDTH = 420;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      minHeight: ART_HEIGHT,
      justifyContent: 'flex-start',
      marginHorizontal: -theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    layer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: ART_HEIGHT,
    },
    scene: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      height: ART_HEIGHT,
      width: '100%',
      maxWidth: SCENE_MAX_WIDTH,
    },
  });
