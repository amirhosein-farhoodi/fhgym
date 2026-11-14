import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/features/auth/AuthProvider'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Gym wifi is bad and program data barely changes within a session.
        staleTime: 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function AppProviders({ children }: { children: ReactNode }) {
  // useState so StrictMode's double-invoke does not build two clients.
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}
