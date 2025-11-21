import type { ReactNode } from 'react'
import FormError from './FormError'
import FormLabel from './FormLabel'

export default function FormField({
  label,
  required,
  errorMessage,
  htmlFor,
  children
}: {
  label?: string
  required?: boolean
  errorMessage?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className='w-full space-y-1'>
      {label && <FormLabel htmlFor={htmlFor} label={label} required={required} />}
      {children}
      <FormError message={errorMessage} />
    </div>
  )
}
