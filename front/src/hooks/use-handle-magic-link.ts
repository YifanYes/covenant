import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from './use-auth-store'
import { useSnackbar } from './use-snackbar'

export const useHandleMagicLink = () => {
  const { updateUserInfo } = useAuthStore()
  const navigate = useNavigate()
  const { show } = useSnackbar()

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)

    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const error = hashParams.get('error')
    const errorDescription = hashParams.get('error_description')

    if (error && errorDescription) {
      show({
        variant: 'destructive',
        title: 'Authentication Error',
        description: errorDescription.replace(/\+/g, ' ')
      })
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    if (accessToken && refreshToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        const userEmail = payload.email
        const userId = payload.sub

        updateUserInfo({
          email: userEmail,
          userId: userId,
          accessToken: accessToken,
          refreshToken: refreshToken
        })

        // Clear the hash from the URL
        window.history.replaceState(null, '', window.location.pathname)
        
        // We don't force a redirect here, assuming the user is already at the desired destination
        // (e.g. /onboarding) or the router will handle it.
      } catch (error) {
        console.error('Error parsing access token:', error)
        show({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to parse authentication tokens'
        })
      }
    }
  }, [updateUserInfo, navigate, show])
}
