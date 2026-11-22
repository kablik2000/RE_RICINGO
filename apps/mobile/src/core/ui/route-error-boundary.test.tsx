import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/testing/render-with-providers';

import { AppError } from '../errors';
import { telemetry } from '../telemetry';
import { RouteErrorBoundary } from './route-error-boundary';

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(telemetry, 'captureError').mockImplementation(() => undefined);
  });

  it('reports the error and offers retry for network failures', async () => {
    const retry = jest.fn(() => Promise.resolve());
    const error = new AppError('network', 'offline');

    await renderWithProviders(<RouteErrorBoundary error={error} retry={retry} />);

    expect(screen.getByText('Nepodařilo se připojit')).toBeOnTheScreen();
    expect(telemetry.captureError).toHaveBeenCalledWith(error, { source: 'route-error-boundary' });
    await fireEvent.press(screen.getByRole('button', { name: 'Zkusit znovu' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('does not offer retry when retrying cannot help', async () => {
    await renderWithProviders(
      <RouteErrorBoundary
        error={new AppError('forbidden', 'no access')}
        retry={() => Promise.resolve()}
      />,
    );

    expect(screen.getByText('Sem nemáte přístup')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('treats unknown errors as unexpected', async () => {
    await renderWithProviders(
      <RouteErrorBoundary error={new Error('boom')} retry={() => Promise.resolve()} />,
    );

    expect(screen.getByText('Něco se pokazilo')).toBeOnTheScreen();
  });
});
