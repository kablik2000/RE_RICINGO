import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { toAppError } from '@/core/errors';

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

export interface DataProviderProps {
  children: ReactNode;
  /** Injected in tests; the app creates one client per mount. */
  client?: QueryClient;
}

export function DataProvider({ children, client }: DataProviderProps) {
  const [queryClient] = useState(() => client ?? createQueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
