import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { EmptyState, ErrorState, LoadingState } from './state-views';

describe('state views', () => {
  it('LoadingState exposes its message to assistive technology', async () => {
    await renderWithTheme(<LoadingState message="Načítám lekce" />);

    expect(screen.getByRole('progressbar', { name: 'Načítám lekce' })).toBeOnTheScreen();
    expect(screen.queryByText('Načítám lekce')).toBeNull();
  });

  it('EmptyState renders title, message and action', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <EmptyState
        title="Žádné lekce"
        message="Lektor ti zatím nic nepřiřadil."
        action={{ label: 'Obnovit', onPress }}
      />,
    );

    expect(screen.getByRole('header', { name: 'Žádné lekce' })).toBeOnTheScreen();
    expect(screen.getByText('Lektor ti zatím nic nepřiřadil.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Obnovit' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ErrorState offers retry only when provided', async () => {
    const onRetry = jest.fn();
    const { rerender } = await renderWithTheme(
      <ErrorState title="Něco se pokazilo" retry={{ label: 'Zkusit znovu', onPress: onRetry }} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Zkusit znovu' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await rerender(<ErrorState title="Něco se pokazilo" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
