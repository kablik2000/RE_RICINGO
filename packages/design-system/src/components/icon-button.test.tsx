import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  it('is announced by its label and calls onPress', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <IconButton icon="volume" accessibilityLabel="Přehrát větu" onPress={onPress} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Přehrát větu' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not react when disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <IconButton icon="volume" accessibilityLabel="Přehrát" onPress={onPress} disabled />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Přehrát' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
