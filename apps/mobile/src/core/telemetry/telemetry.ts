import type { AppError } from '../errors';

export type TelemetryContext = Readonly<Record<string, string | number | boolean>>;

/**
 * Error/crash reporting port. The app reports through this interface only, so the provider
 * (Sentry proposed, pending budget decision Q-9) can be plugged in without touching features.
 */
export interface Telemetry {
  captureError(error: AppError, context?: TelemetryContext): void;
}

/** Development reporter: writes to the Metro/device log. */
export function createConsoleTelemetry(): Telemetry {
  return {
    captureError(error, context) {
      // eslint-disable-next-line no-console -- this adapter's purpose is console output
      console.error(`[telemetry] ${error.kind}: ${error.message}`, { context, cause: error.cause });
    },
  };
}
