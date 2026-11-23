import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { Card } from './card';
import { Disclosure } from './disclosure';
import { ProgressBar } from './progress-bar';
import { Text } from './text';

describe('Disclosure', () => {
  it('reveals its content on press and reports the expanded state', async () => {
    await renderWithTheme(
      <Disclosure title="Gramatika">
        <Text>Condizionale presente</Text>
      </Disclosure>,
    );

    const header = screen.getByRole('button', { name: 'Gramatika' });
    expect(header).not.toBeExpanded();
    expect(screen.queryByText('Condizionale presente')).toBeNull();

    await fireEvent.press(header);

    expect(header).toBeExpanded();
    expect(screen.getByText('Condizionale presente')).toBeOnTheScreen();
  });
});

describe('Card', () => {
  it('is a button only when pressable', async () => {
    const onPress = jest.fn();
    const { rerender } = await renderWithTheme(
      <Card>
        <Text>Al bar</Text>
      </Card>,
    );
    expect(screen.queryByRole('button')).toBeNull();

    await rerender(
      <Card onPress={onPress} accessibilityLabel="Al bar, lekce A1">
        <Text>Al bar</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Al bar, lekce A1' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ProgressBar', () => {
  it('exposes a clamped percentage', async () => {
    await renderWithTheme(<ProgressBar value={1.5} accessibilityLabel="Věta 11 z 11" />);

    expect(screen.getByRole('progressbar', { name: 'Věta 11 z 11' })).toHaveAccessibilityValue({
      now: 100,
    });
  });
});
