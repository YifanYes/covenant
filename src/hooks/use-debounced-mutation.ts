import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { useRef } from 'react'

export const useDebouncedMutation = <TData, TError, TVariables>(
  mutationOpts: UseMutationOptions<TData, TError, TVariables, unknown>,
  delay = 500
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mutation = useMutation<TData, TError, TVariables>(mutationOpts)

  const debouncedMutate = (vars: TVariables) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => mutation.mutate(vars), delay)
  }

  const cancel = () => timeoutRef.current && clearTimeout(timeoutRef.current)

  return { ...mutation, debouncedMutate, cancel }
}
