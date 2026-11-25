import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppError } from '@/core/errors';

import { AccountError, type AccountDetails, type SignedIn } from './account/account-api';
import { deviceName } from './account/device-name';
import { accountQueryKeys } from './query-keys';
import { useDataServices } from './query-provider';

function requireApi<T>(api: T | null): T {
  if (api === null) {
    throw new AppError('unexpected', 'This build has no server for student accounts.');
  }
  return api;
}

/**
 * The signed-in student and their devices; `null` when nobody is signed in on this device.
 * `enabled` is false in builds without a server (web preview), where accounts do not exist.
 */
export function useAccount() {
  const { account, tokens } = useDataServices();
  const query = useQuery({
    queryKey: accountQueryKeys.me(),
    enabled: account !== null,
    queryFn: async (): Promise<AccountDetails | null> => {
      const token = await tokens.read();
      if (token === null || account === null) return null;
      try {
        return await account.me(token);
      } catch (error) {
        // The session ended on the server (signed out elsewhere, removed by the lecturer).
        if (error instanceof AccountError && error.code === 'unauthorized') {
          await tokens.clear();
          return null;
        }
        throw error;
      }
    },
  });
  return { enabled: account !== null, query };
}

function useAfterSignIn() {
  const { tokens } = useDataServices();
  const queryClient = useQueryClient();
  return async (signedIn: SignedIn) => {
    await tokens.write(signedIn.token);
    await queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
  };
}

/** Redeems an invitation code: creates the account and signs this device in. */
export function useAcceptInvitation() {
  const { account } = useDataServices();
  const afterSignIn = useAfterSignIn();
  return useMutation({
    mutationFn: async (input: { code: string; password: string }) =>
      afterSignIn(
        await requireApi(account).acceptInvitation({ ...input, deviceName: deviceName() }),
      ),
  });
}

/** Signs this device in; `replaceDeviceId` signs that device out when 3 are already in use. */
export function useSignIn() {
  const { account } = useDataServices();
  const afterSignIn = useAfterSignIn();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; replaceDeviceId?: string }) =>
      afterSignIn(await requireApi(account).signIn({ ...input, deviceName: deviceName() })),
  });
}

/** Signs this device out. Offline, the session is forgotten here and ends on the server later. */
export function useSignOut() {
  const { account, tokens } = useDataServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await tokens.read();
      if (token !== null && account !== null) {
        try {
          await account.signOut(token);
        } catch (error) {
          if (!(error instanceof AppError) || error.kind !== 'network') throw error;
        }
      }
      await tokens.clear();
    },
    onSuccess: () => {
      queryClient.setQueryData(accountQueryKeys.me(), null);
    },
  });
}

/** Signs one of the student's other devices out. */
export function useRemoveDevice() {
  const { account, tokens } = useDataServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const token = await tokens.read();
      if (token === null) throw new AccountError('unauthorized', 'Not signed in.');
      await requireApi(account).removeDevice(token, deviceId);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
  });
}
