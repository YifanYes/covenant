import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from './config.lib'

// Server-side Supabase instance (for server components, server actions, route handlers)
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
