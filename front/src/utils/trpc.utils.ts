import { env } from '@/lib/config.lib'
import { supabase } from '@/lib/supabase.lib'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from '../../../server/router'

export const queryClient = new QueryClient()

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: env.VITE_API_URL,
      async headers() {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token

        return {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      }
    })
  ]
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient
})
