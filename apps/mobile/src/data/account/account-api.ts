import { z } from 'zod';

import { AppError, toAppError, type AppErrorKind } from '@/core/errors';

/**
 * Student account on the RICI API (`/api/v1/student`, ADR-0013). Every method rejects with an
 * AppError; refusals the student can act on are an `AccountError` with the API's code.
 */

export const ACCOUNT_ERROR_CODES = [
  'invalid_invitation',
  'weak_password',
  'existing_account',
  'invalid_credentials',
  'too_many_attempts',
  'device_limit',
  'unauthorized',
] as const;
export type AccountErrorCode = (typeof ACCOUNT_ERROR_CODES)[number];

const deviceSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  signedInAt: z.string(),
  lastSeenAt: z.string(),
  current: z.boolean(),
});
export type Device = z.infer<typeof deviceSchema>;

const KIND_BY_CODE: Readonly<Record<AccountErrorCode, AppErrorKind>> = {
  invalid_invitation: 'validation',
  weak_password: 'validation',
  existing_account: 'conflict',
  invalid_credentials: 'auth',
  too_many_attempts: 'forbidden',
  device_limit: 'conflict',
  unauthorized: 'auth',
};

/** A refusal the student can act on (wrong code, wrong password, too many devices …). */
export class AccountError extends AppError {
  constructor(
    readonly code: AccountErrorCode,
    message: string,
    /** Devices to choose from when `code` is `device_limit`. */
    readonly devices: readonly Device[] = [],
    /** Seconds to wait when `code` is `too_many_attempts`. */
    readonly retryAfter?: number,
  ) {
    super(KIND_BY_CODE[code], message);
    this.name = 'AccountError';
  }
}

const studentSchema = z.object({ id: z.string(), email: z.string(), displayName: z.string() });
export type Student = z.infer<typeof studentSchema>;

const signedInSchema = z.object({ token: z.string().min(1), student: studentSchema });
export type SignedIn = z.infer<typeof signedInSchema>;

const meSchema = z.object({
  student: studentSchema,
  devices: z.array(deviceSchema),
  maxDevices: z.number(),
});
export type AccountDetails = z.infer<typeof meSchema>;

const recommendationSchema = z.object({
  id: z.string(),
  kind: z.enum(['lesson', 'practice', 'vocabulary']),
  teacherName: z.string(),
  lesson: z.object({
    id: z.string(),
    titleItalian: z.string(),
    titleCzech: z.string(),
    level: z.string(),
  }),
  grammarTopic: z.object({ id: z.string(), title: z.string() }).nullable(),
  words: z.array(z.object({ id: z.string(), lemma: z.string(), translation: z.string() })),
  note: z.string().nullable(),
  createdAt: z.string(),
});
/** What the student's lecturer recommends (ADR-0013): a lesson, practice or chosen words. */
export type Recommendation = z.infer<typeof recommendationSchema>;
export const recommendationsSchema = z.array(recommendationSchema);

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    devices: z.array(deviceSchema).optional(),
    retryAfter: z.number().optional(),
  }),
});

export interface AccountApi {
  acceptInvitation(input: {
    code: string;
    password: string;
    deviceName: string;
  }): Promise<SignedIn>;
  signIn(input: {
    email: string;
    password: string;
    deviceName: string;
    replaceDeviceId?: string;
  }): Promise<SignedIn>;
  me(token: string): Promise<AccountDetails>;
  signOut(token: string): Promise<void>;
  removeDevice(token: string, deviceId: string): Promise<void>;
  recommendations(token: string): Promise<readonly Recommendation[]>;
}

const REQUEST_TIMEOUT_MS = 20_000;

function isAccountErrorCode(code: string): code is AccountErrorCode {
  return (ACCOUNT_ERROR_CODES as readonly string[]).includes(code);
}

export function createAccountApi(baseUrl: string, fetchImpl: typeof fetch = fetch): AccountApi {
  async function call<T>(
    path: string,
    schema: z.ZodType<T>,
    init: { method?: string; body?: unknown; token?: string } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (init.token !== undefined) headers.Authorization = `Bearer ${init.token}`;
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/api/v1/student${path}`, {
        method: init.method ?? 'GET',
        headers,
        signal: controller.signal,
        ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
      });
    } catch (error) {
      throw new AppError('network', `Cannot reach the server: ${toAppError(error).message}`, {
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status === 204) {
      return schema.parse(null);
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorSchema.safeParse(body);
      if (parsed.success && isAccountErrorCode(parsed.data.error.code)) {
        const { code, message, devices, retryAfter } = parsed.data.error;
        throw new AccountError(code, message, devices ?? [], retryAfter);
      }
      const kind: AppErrorKind = response.status >= 500 ? 'network' : 'unexpected';
      throw new AppError(kind, `The server answered ${response.status} for ${path}.`);
    }
    try {
      return schema.parse(body);
    } catch (error) {
      throw new AppError('validation', `Unexpected answer from the server for ${path}.`, {
        cause: error,
      });
    }
  }

  return {
    acceptInvitation: (input) =>
      call('/invitations/accept', signedInSchema, { method: 'POST', body: input }),
    signIn: (input) => call('/login', signedInSchema, { method: 'POST', body: input }),
    me: (token) => call('/me', meSchema, { token }),
    async signOut(token) {
      await call('/logout', z.null(), { method: 'POST', token });
    },
    recommendations: async (token) =>
      (
        await call('/recommendations', z.object({ recommendations: recommendationsSchema }), {
          token,
        })
      ).recommendations,
    async removeDevice(token, deviceId) {
      await call(`/devices/${encodeURIComponent(deviceId)}`, z.null(), {
        method: 'DELETE',
        token,
      });
    },
  };
}
