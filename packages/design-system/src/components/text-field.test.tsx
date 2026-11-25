import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../testing/render-with-theme';
import { TextField } from './text-field';

describe('TextField', () => {
  it('is named by its label and reports typed text', async () => {
    const onChangeText = jest.fn();
    await renderWithTheme(
      <TextField label="E-mail" value="" onChangeText={onChangeText} supportingText="Váš e-mail" />,
    );

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'marie@example.test');

    expect(onChangeText).toHaveBeenCalledWith('marie@example.test');
    expect(screen.getByText('Váš e-mail')).toBeOnTheScreen();
  });

  it('replaces the supporting text with an announced error', async () => {
    await renderWithTheme(
      <TextField
        label="Heslo"
        value="abc"
        onChangeText={jest.fn()}
        supportingText="Aspoň 12 znaků"
        error="Heslo je příliš krátké."
        secureTextEntry
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Heslo je příliš krátké.');
    expect(screen.queryByText('Aspoň 12 znaků')).toBeNull();
  });
});
