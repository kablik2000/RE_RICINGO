import { createConsoleTelemetry, type Telemetry } from './telemetry';

export type { Telemetry, TelemetryContext } from './telemetry';

/**
 * Active reporter. All environments log to the console until a crash-reporting provider is
 * approved (DEVELOPMENT_PLAN Q-9) — tracked as technical debt; production errors are not yet
 * collected remotely.
 */
export const telemetry: Telemetry = createConsoleTelemetry();
