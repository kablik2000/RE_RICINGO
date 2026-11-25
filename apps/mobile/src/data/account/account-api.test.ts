import { AppError } from '@/core/errors';

import { AccountError, createAccountApi } from './account-api';

function respond(body: unknown, status = 200) {
  return jest.fn(() =>
    Promise.resolve(
      status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
    ),
  );
}

const STUDENT = { id: 's1', email: 'marie@example.test', displayName: 'Marie' };

describe('account API', () => {
  it('accepts an invitation and returns the session', async () => {
    const fetchImpl = respond({
      token: 'abc',
      expiresAt: '2027-01-01T00:00:00Z',
      student: STUDENT,
    });
    const api = createAccountApi('http://api', fetchImpl);

    const signedIn = await api.acceptInvitation({ code: 'X', password: 'p', deviceName: 'Pixel' });

    expect(signedIn).toMatchObject({ token: 'abc', student: STUDENT });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api/api/v1/student/invitations/accept',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('turns refusals into AccountErrors with their code and details', async () => {
    const device = {
      id: 'd1',
      name: 'Tablet',
      signedInAt: '2026-11-01T00:00:00Z',
      lastSeenAt: '2026-11-20T00:00:00Z',
      current: false,
    };
    const api = createAccountApi(
      'http://api',
      respond({ error: { code: 'device_limit', message: 'Too many.', devices: [device] } }, 409),
    );

    const error = await api
      .signIn({ email: 'a@b.cz', password: 'p', deviceName: 'X' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountError);
    expect(error).toMatchObject({ code: 'device_limit', kind: 'conflict', devices: [device] });
  });

  it('sends the token and accepts an empty answer', async () => {
    const fetchImpl = respond(null, 204);
    const api = createAccountApi('http://api', fetchImpl);

    await api.removeDevice('tok', 'd1');

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('reports an unreachable server as a network error', async () => {
    const api = createAccountApi(
      'http://api',
      jest.fn(() => Promise.reject(new Error('offline'))),
    );

    const error = await api.me('tok').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'network' });
  });
});
