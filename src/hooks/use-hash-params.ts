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
  // Intentional: searchParams isn't read inside the callback, but its presence in the dep array causes
  // re-evaluation on navigation (Next.js refreshes searchParams on route changes), keeping hash params
  // in sync without a separate router event subscription.
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  return hashParams
}

export default useHashParams
