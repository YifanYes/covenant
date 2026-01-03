import { useAuthStore } from '@/hooks/use-auth-store'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

export default function PrivateRoute() {
  const navigate = useNavigate()
  const updateUserInfo = useAuthStore((state) => state.updateUserInfo)

  // Check if there's a hash with tokens (magic link callback)
  const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
  const hashParams = new URLSearchParams(hash)
  const hasTokensInUrl = !!hashParams.get('access_token') && !!hashParams.get('refresh_token')

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // If tokens are in URL, wait for Supabase to process them
    if (hasTokensInUrl) {
      return
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true)
        updateUserInfo({
          email: session.user.email || '',
          userId: session.user.id
        })
      } else {
        navigate('/login')
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true)
        setIsLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
        navigate('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate, hasTokensInUrl, updateUserInfo])

  if (isLoading || hasTokensInUrl) {
    return null // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null
  }

  return <Outlet />
}
