import { createBrowserClient } from '@supabase/ssr'
import { env } from './config.lib'

// Client-side Supabase instance (for client components)
export const createClient = () => {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
