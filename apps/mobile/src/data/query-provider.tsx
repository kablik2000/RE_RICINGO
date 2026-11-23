import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { toAppError } from '@/core/errors';

import { lessonQueryKeys } from './query-keys';
import { getAppServices, type DataServices } from './services';

const MAX_RETRIES = 2;
const STALE_TIME_MS = 5 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        // Retrying cannot fix missing, forbidden or invalid content.
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES && ['network', 'unexpected'].includes(toAppError(error).kind),
      },
    },
  });
}

const DataServicesContext = createContext<DataServices | null>(null);

/** The data services of the nearest `DataProvider`. */
export function useDataServices(): DataServices {
  const services = useContext(DataServicesContext);
  if (services === null) {
    throw new Error('useDataServices must be used inside <DataProvider>.');
  }
  return services;
}

export interface DataProviderProps {
  children: ReactNode;
  /** Injected in tests; the app creates one client per mount. */
  client?: QueryClient;
  /** Injected in tests; the app uses its single set of services. */
  services?: DataServices;
}

export function DataProvider({ children, client, services }: DataProviderProps) {
  const [queryClient] = useState(() => client ?? createQueryClient());
  const [resolved] = useState(() => services ?? getAppServices());

  // Installed lesson updates are an external change: refresh what screens show from them.
  useEffect(
    () =>
      resolved.library.onInstalled((lessonIds) => {
        void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.list() });
        void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.vocabulary() });
        lessonIds.forEach((lessonId) => {
          void queryClient.invalidateQueries({ queryKey: lessonQueryKeys.bundle(lessonId) });
        });
      }),
    [queryClient, resolved],
  );

  return (
    <DataServicesContext.Provider value={resolved}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DataServicesContext.Provider>
  );
}
