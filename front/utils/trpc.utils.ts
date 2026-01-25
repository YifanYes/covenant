'use client'

import { env } from '@/lib/config.lib'
import { createClient } from '@/lib/supabase.lib'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../../server/router'

export const trpc = createTRPCReact<AppRouter>()

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: env.NEXT_PUBLIC_API_URL,
      async headers() {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token

        return {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      },
    }),
  ],
})
