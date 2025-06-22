import { useAuthStore } from '@/hooks/useStore'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'

export default function PrivateRoute() {
  const { accessToken, refreshToken } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      navigate('/')
    }
  }, [accessToken, refreshToken, navigate])

  return <Outlet />
}
