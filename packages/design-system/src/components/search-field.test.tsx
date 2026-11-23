import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { SearchField } from './search-field';

function renderField(value: string, onChangeText = jest.fn()) {
  return renderWithTheme(
    <SearchField
      value={value}
      onChangeText={onChangeText}
      placeholder="Hledat"
      accessibilityLabel="Hledat ve slovníku"
      clearLabel="Vymazat hledání"
    />,
  );
}

describe('SearchField', () => {
  it('reports typed text', async () => {
    const onChangeText = jest.fn();
    await renderField('', onChangeText);

    await fireEvent.changeText(screen.getByLabelText('Hledat ve slovníku'), 'caffè');

    expect(onChangeText).toHaveBeenCalledWith('caffè');
  });

  it('offers a clear button only when there is text', async () => {
    const onChangeText = jest.fn();
    const { rerender } = await renderField('', onChangeText);
    expect(screen.queryByRole('button', { name: 'Vymazat hledání' })).not.toBeOnTheScreen();

    await rerender(
      <SearchField
        value="bar"
        onChangeText={onChangeText}
        placeholder="Hledat"
        accessibilityLabel="Hledat ve slovníku"
        clearLabel="Vymazat hledání"
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Vymazat hledání' }));

    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
