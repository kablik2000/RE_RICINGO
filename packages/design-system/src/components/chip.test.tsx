import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { Chip, FilterChip } from './chip';

describe('Chip', () => {
  it('shows its label', async () => {
    await renderWithTheme(<Chip label="A1" />);

    expect(screen.getByText('A1')).toBeOnTheScreen();
  });
});

describe('FilterChip', () => {
  it('exposes the selected state and toggles on press', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<FilterChip label="Slovesa" selected={false} onPress={onPress} />);

    const chip = screen.getByRole('button', { name: 'Slovesa' });
    expect(chip).not.toBeSelected();
    await fireEvent.press(chip);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is announced as selected', async () => {
    await renderWithTheme(<FilterChip label="Vše" selected onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Vše' })).toBeSelected();
  });
});
