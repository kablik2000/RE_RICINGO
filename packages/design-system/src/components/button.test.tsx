import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { Button } from './button';

describe('Button', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Pokračovat" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Pokračovat' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Pokračovat" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', { name: 'Pokračovat' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('follows the parent alignment unless fullWidth is set', async () => {
    const { rerender } = await renderWithTheme(<Button label="Dál" onPress={jest.fn()} />);
    expect(screen.getByRole('button')).not.toHaveStyle({ alignSelf: 'flex-start' });
    expect(screen.getByRole('button')).not.toHaveStyle({ alignSelf: 'stretch' });

    await rerender(<Button label="Dál" onPress={jest.fn()} fullWidth />);
    expect(screen.getByRole('button')).toHaveStyle({ alignSelf: 'stretch' });
  });

  it('is busy, keeps its accessible name and ignores presses while loading', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Uložit" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Uložit' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
    expect(screen.queryByText('Uložit')).toBeNull();
  });
});
