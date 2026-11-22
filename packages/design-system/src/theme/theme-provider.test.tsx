import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { colorSchemes } from '../tokens/color-schemes';
import { useTheme } from './theme-provider';

function SchemeProbe() {
  const theme = useTheme();
  return <Text>{`${theme.scheme}:${theme.colors.primary}`}</Text>;
}

describe('ThemeProvider', () => {
  it.each(['light', 'dark'] as const)('provides the %s theme when forced', async (scheme) => {
    await renderWithTheme(<SchemeProbe />, scheme);

    expect(screen.getByText(`${scheme}:${colorSchemes[scheme].primary}`)).toBeOnTheScreen();
  });

  it('fails loudly when a component is rendered outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(render(<SchemeProbe />)).rejects.toThrow(
      'useTheme must be used inside <ThemeProvider>.',
    );
  });
});
