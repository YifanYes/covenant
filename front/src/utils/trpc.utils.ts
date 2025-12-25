import { useAuthStore } from '@/hooks/use-auth-store'
import { env } from '@/lib/config'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from '../../../server/router'

export const queryClient = new QueryClient()

type FetchEsque = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const fetchWithRefreshToken: FetchEsque = async (input, init) => {
  const { accessToken, refreshToken, setTokens, resetUserInfo } = useAuthStore.getState()

  const injectAuth = (token?: string): RequestInit => ({
    ...(init as RequestInit),
    credentials: 'include' as RequestCredentials,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })

  try {
    const res = await fetch(input, injectAuth(accessToken))

    if (res.status !== 401 || !refreshToken) return res

    // Try refreshing token if unauthorized
    const refreshRes = await fetch(`${env.VITE_API_URL}/auth.refreshToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accessToken, refreshToken })
    })

    const json = await refreshRes.json()
    const newAccessToken = json.result?.data?.accessToken
    const newRefreshToken = json.result?.data?.refreshToken

    if (!newAccessToken || !newRefreshToken) {
      resetUserInfo()
      throw new Error('Token refresh failed')
    }

    setTokens({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })

    // Retry original request with new access token
    return await fetch(input, injectAuth(newAccessToken))
  } catch (err) {
    console.error('Fetch failed:', err)
    throw err
  }
}

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: env.VITE_API_URL,
      fetch: fetchWithRefreshToken
    })
  ]
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient
})
