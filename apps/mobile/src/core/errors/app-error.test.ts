import { z } from 'zod';

import { AppError, toAppError } from './app-error';

describe('toAppError', () => {
  it('returns an AppError unchanged', () => {
    const error = new AppError('network', 'offline');
    expect(toAppError(error)).toBe(error);
  });

  it('maps validation failures to the validation kind', () => {
    const result = z.object({ id: z.string() }).safeParse({ id: 1 });
    expect(result.success).toBe(false);

    const appError = toAppError(result.error);

    expect(appError.kind).toBe('validation');
    expect(appError.cause).toBe(result.error);
  });

  it('wraps unknown errors as unexpected and keeps the cause', () => {
    const original = new TypeError('boom');

    const appError = toAppError(original);

    expect(appError).toBeInstanceOf(AppError);
    expect(appError.kind).toBe('unexpected');
    expect(appError.message).toBe('boom');
    expect(appError.cause).toBe(original);
  });

  it('handles non-Error values', () => {
    expect(toAppError('oops').message).toContain('oops');
  });
});
