'use client'

import { env } from '@/lib/config.lib'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from '../../server/router'

// Shared link configuration - uses cookies for Better Auth sessions
const trpcLink = httpBatchLink({
  url: `${env.NEXT_PUBLIC_API_URL}/trpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: 'include'
    })
  }
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

// Hybrid client that combines both approaches
export const trpc = new Proxy(trpcReact, {
  get(target, prop) {
    // If the property exists on trpcReact, use it (for Provider, hooks, etc.)
    if (prop in target) {
      return target[prop as keyof typeof target]
    }
    // Otherwise, delegate to trpcOptions (for queryOptions, mutationOptions, etc.)
    return (trpcOptions as any)[prop]
  },
}) as typeof trpcReact & typeof trpcOptions
