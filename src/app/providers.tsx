import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/features/auth/AuthProvider'

const WEEK = 7 * 24 * 60 * 60 * 1000
const PERSIST_MAX_AGE = 8 * WEEK

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Gym wifi is bad and program data barely changes within a session.
        staleTime: 60_000,
        // Must outlive the persisted cache, or restored queries are garbage-collected
        // before anyone reads them.
        gcTime: PERSIST_MAX_AGE,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

/*
 * Offline-first trainee data.
 *
 * Only the trainee's own queries are written to localStorage — one program tree, today's
 * ticks and recent history, a few tens of KB. The coach's catalog pages are deliberately
 * left out: they are large, and coaches work online.
 *
 * On launch the cache is restored synchronously-fast, the workout renders immediately, and
 * then (if online) everything refetches in the background. A program the coach changed
 * last week appears on the next online open; offline, the last good copy keeps working.
 */
const persister =
  typeof window === 'undefined' ? undefined : (
    createSyncStoragePersister({ storage: window.localStorage, key: 'fh.query-cache' })
  )

export function AppProviders({ children }: { children: ReactNode }) {
  // useState so StrictMode's double-invoke does not build two clients.
  const [queryClient] = useState(createQueryClient)

  const tree = (
    <I18nProvider>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  )

  if (!persister) return <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider>

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        // Bump when the shape of persisted data changes, to discard old caches.
        buster: 'v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.queryKey[0] === 'trainee' && query.state.status === 'success',
        },
      }}
      onSuccess={() => {
        // Restored from disk — now resume any ticks made offline and refresh from the server.
        void queryClient.resumePausedMutations()
      }}
    >
      {tree}
    </PersistQueryClientProvider>
  )
}
