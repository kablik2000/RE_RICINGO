import { telemetry } from '@/core/telemetry';
import { toAppError } from '@/core/errors';

/**
 * Registers the web app's service worker (ADR-0019), written into production web builds by
 * `scripts/write-service-worker.mjs`. The development server has none, so nothing is cached
 * while developing.
 */
export function registerServiceWorker(): void {
  if (__DEV__ || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    telemetry.captureError(toAppError(error), { source: 'service-worker' });
  });
}
