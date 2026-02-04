import { magicLinkClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { env } from './config.lib'

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  plugins: [magicLinkClient()],
  fetchOptions: {
    credentials: 'include'
  }
})

export const { signIn, signOut, useSession } = authClient
