import { useMemo } from 'react'
import { useLocation } from 'react-router'

export const useHashParams = () => {
  const location = useLocation()

  const hashParams = useMemo(() => {
    const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
    return Object.fromEntries(new URLSearchParams(hash))
  }, [location.hash])

  return hashParams
}

export default useHashParams
