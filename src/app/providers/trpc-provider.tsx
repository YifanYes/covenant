'use client'

import { queryClient, trpcClient, trpcReactClient } from '@/utils/trpc.utils'
import { QueryClientProvider } from '@tanstack/react-query'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  return (
    <trpcReactClient.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpcReactClient.Provider>
  )
}
