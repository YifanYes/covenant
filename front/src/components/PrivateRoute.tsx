import { useAuthStore } from '@/hooks/use-auth-store'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'

export default function PrivateRoute() {
  const { accessToken, refreshToken } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // If we don't have tokens, but a Supabase magic‑link hash is present, wait for the hook to populate the store
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)
    const hasAccess = !!hashParams.get('access_token')
    const hasRefresh = !!hashParams.get('refresh_token')

    if (!accessToken || !refreshToken) {
      if (hasAccess && hasRefresh) {
        // Tokens will be set by useHandleMagicLink
        return
      }
      
      navigate('/login')
    }
  }, [accessToken, refreshToken, navigate])

  return <Outlet />
}
