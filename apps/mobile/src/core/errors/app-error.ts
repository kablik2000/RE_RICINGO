import { ZodError } from 'zod';

/**
 * Every failure that crosses the data-layer boundary is an AppError with one of these kinds.
 * UI decides presentation by kind; raw library errors (Supabase, SQLite, fetch) never leak upward.
 */
export const APP_ERROR_KINDS = [
  'network',
  'auth',
  'forbidden',
  'notFound',
  'validation',
  'conflict',
  'unexpected',
] as const;

export type AppErrorKind = (typeof APP_ERROR_KINDS)[number];

export class AppError extends Error {
  readonly kind: AppErrorKind;

  constructor(kind: AppErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.kind = kind;
  }
}

/** Normalises anything thrown into an AppError, preserving the original as `cause`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new AppError('validation', 'Data failed validation.', { cause: error });
  }
  if (error instanceof Error) {
    return new AppError('unexpected', error.message, { cause: error });
  }
  return new AppError('unexpected', `Non-error value thrown: ${String(error)}`, { cause: error });
}
