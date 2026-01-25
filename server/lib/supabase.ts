import { createClient } from '@supabase/supabase-js'
import { env } from '../config'

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
})

export { supabase }
