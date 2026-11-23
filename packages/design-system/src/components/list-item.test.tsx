import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { ListItem } from './list-item';

describe('ListItem', () => {
  it('shows title and supporting text', async () => {
    await renderWithTheme(<ListItem title="cappuccino" supporting="cappuccino · Al bar" />);

    expect(screen.getByText('cappuccino')).toBeOnTheScreen();
    expect(screen.getByText('cappuccino · Al bar')).toBeOnTheScreen();
  });

  it('is a button when it has onPress', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <ListItem title="Pozdravy" onPress={onPress} accessibilityLabel="Pozdravy během dne" />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Pozdravy během dne' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
