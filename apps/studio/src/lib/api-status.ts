import { z } from 'zod';

const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['ok', 'unavailable']),
});

export type ApiHealth = z.infer<typeof healthSchema>;

/** What the Studio knows about its backend (ADR-0010). */
export type ApiStatus =
  { kind: 'online' } | { kind: 'degraded' } | { kind: 'offline'; reason: string };

/** Backend base URL; server-side only. Defaults to the local Docker stack. */
export function apiBaseUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  return env.RICI_API_URL ?? 'http://localhost:8000';
}

/**
 * Reads `/api/v1/health`. Never throws: an unreachable or malformed backend is a status the
 * Studio shows, with the reason kept for logs.
 */
export async function fetchApiStatus(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiStatus> {
  try {
    const response = await fetchImpl(`${baseUrl}/api/v1/health`, { cache: 'no-store' });
    const health = healthSchema.parse(await response.json());
    return health.database === 'ok' ? { kind: 'online' } : { kind: 'degraded' };
  } catch (error) {
    return { kind: 'offline', reason: error instanceof Error ? error.message : String(error) };
  }
}
