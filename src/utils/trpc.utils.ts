'use client'

import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from '@/server/router'

// Same-origin link — cookies sent automatically
const trpcLink = httpBatchLink({
  url: '/api/trpc'
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

// Vanilla tRPC client
const vanillaClient = createTRPCClient<AppRouter>({
  links: [trpcLink],
})

// React hooks client - provides .Provider, .useMutation(), etc.
const trpcReact = createTRPCReact<AppRouter>()

export const trpcClient = trpcReact.createClient({
  links: [trpcLink],
})

// Export trpcReact for Provider usage
export const trpcReactClient = trpcReact

// Options proxy - provides .queryOptions() and .mutationOptions()
const trpcOptions = createTRPCOptionsProxy<AppRouter>({
  client: vanillaClient as any,
  queryClient,
})

// Export trpcReact directly for hooks (useQuery, useMutation, etc.)
export const trpc = trpcReact

// Export trpcOptions separately for queryOptions/mutationOptions
// Use this with useSuspenseQuery, useQuery from @tanstack/react-query
export { trpcOptions }
