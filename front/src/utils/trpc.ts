import { useAuthStore } from '@/hooks/useStore'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from '../../../server/router'

export const queryClient = new QueryClient()

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:2022/trpc',
      fetch(url, options) {
        const { accessToken } = useAuthStore.getState()

        return fetch(url, {
          ...options,
          credentials: 'include',
          ...(accessToken && { headers: { Authorization: `Bearer ${accessToken}` } })
        })
      }
    })
  ]
})
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient
})
