'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

export const useHashParams = () => {
  const searchParams = useSearchParams()

  const hashParams = useMemo(() => {
    // In Next.js, hash params aren't available through useSearchParams
    // This is a client-side only operation
    if (typeof window === 'undefined') return {}

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    return Object.fromEntries(new URLSearchParams(hash))
  }, [searchParams]) // Re-run when searchParams change to keep it reactive

  return hashParams
}

export default useHashParams
