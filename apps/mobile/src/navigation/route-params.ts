/**
 * Expo Router params can be a string, an array (repeated query keys) or missing. Routes read them
 * through this helper so they never depend on generated typed-route definitions.
 */
export function singleParam(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === 'string' || value === undefined ? value : value[0];
}
