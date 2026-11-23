import { render, screen } from '@testing-library/react';

import { t } from '@/i18n';

import { ApiStatusBadge } from './api-status-badge';

describe('ApiStatusBadge', () => {
  it.each([
    [{ kind: 'online' } as const, t('apiStatus.online')],
    [{ kind: 'degraded' } as const, t('apiStatus.degraded')],
    [{ kind: 'offline', reason: 'fetch failed' } as const, t('apiStatus.offline')],
  ])('describes the %o backend', (status, message) => {
    render(<ApiStatusBadge status={status} />);

    expect(screen.getByRole('status').textContent).toBe(message);
  });
});
