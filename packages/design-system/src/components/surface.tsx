import { View, type ViewProps } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import type { ElevationLevel } from '../tokens/elevation';
import type { RadiusToken, SpacingToken } from '../tokens/layout';

export type SurfaceTone =
  'surface' | 'surfaceContainerLow' | 'surfaceContainer' | 'surfaceContainerHigh';

export interface SurfaceProps extends ViewProps {
  tone?: SurfaceTone;
  elevation?: ElevationLevel;
  radius?: RadiusToken;
  padding?: SpacingToken;
}

/** A themed container: cards, panels, grouped content. */
export function Surface({
  tone = 'surface',
  elevation = 0,
  radius = 'lg',
  padding = 'lg',
  style,
  ...rest
}: SurfaceProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors[tone],
          borderRadius: theme.radius[radius],
          padding: theme.spacing[padding],
          boxShadow: theme.elevation[elevation],
        },
        style,
      ]}
    />
  );
}
