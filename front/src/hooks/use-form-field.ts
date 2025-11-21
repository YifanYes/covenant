import { useId } from 'react'

export function useFormField({
  id,
  placeholder,
  required,
  componentPrefix
}: {
  id?: string
  placeholder?: string
  required?: boolean
  componentPrefix: string
}) {
  const generatedId = useId()
  const fieldId = id || `${componentPrefix}-${generatedId}`
  const effectivePlaceholder = placeholder && required ? `${placeholder} *` : placeholder

  return { fieldId, effectivePlaceholder }
}
