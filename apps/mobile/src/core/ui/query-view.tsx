import { LoadingState } from '@ricingo/design-system';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ErrorView } from './error-view';

export interface QueryViewProps<TData> {
  query: UseQueryResult<TData>;
  loadingMessage: string;
  children: (data: TData) => ReactNode;
}

/** Renders the loading and error states of a query consistently; `children` renders the data. */
export function QueryView<TData>({ query, loadingMessage, children }: QueryViewProps<TData>) {
  if (query.isPending) {
    return <LoadingState message={loadingMessage} />;
  }
  if (query.isError) {
    return (
      <ErrorView
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  return children(query.data);
}
