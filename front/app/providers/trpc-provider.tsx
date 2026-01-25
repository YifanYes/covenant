'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { trpcReactClient, trpcClient, queryClient } from '@/utils/trpc.utils'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  return (
    <trpcReactClient.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpcReactClient.Provider>
  )
}
