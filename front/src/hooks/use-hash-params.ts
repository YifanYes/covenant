import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

export const useHashParams = () => {
  const location = useLocation()
  const [hashParams, setHashParams] = useState<Record<string, string>>({})

  useEffect(() => {
    const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
    const params = Object.fromEntries(new URLSearchParams(hash))
    setHashParams(params)
  }, [location])

  return hashParams
}

export default useHashParams
