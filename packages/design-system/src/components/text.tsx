import {
  Text as NativeText,
  type StyleProp,
  type TextProps as NativeTextProps,
  type TextStyle,
} from 'react-native';

import { useTheme } from '../theme/theme-provider';
import type { ColorRole } from '../tokens/color-schemes';
import type { TypographyRole } from '../tokens/typography';

export interface TextProps extends Omit<NativeTextProps, 'style'> {
  variant?: TypographyRole;
  color?: ColorRole;
  align?: TextStyle['textAlign'];
  /** Layout adjustments only (margins, flex). Typography and colour come from tokens. */
  style?: StyleProp<TextStyle>;
}

export function Text({ variant = 'body', color = 'onSurface', align, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <NativeText
      {...rest}
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        align !== undefined && { textAlign: align },
        style,
      ]}
    />
  );
}
