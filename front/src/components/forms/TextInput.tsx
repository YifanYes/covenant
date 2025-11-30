import { useFormField } from '@/hooks/use-form-field'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'
import FormField from './FormField'

export default function TextInput({
  label,
  errorMessage,
  type,
  required = false,
  className,
  ...props
}: ComponentProps<'input'> & {
  errorMessage?: string
  label?: string
  required?: boolean
}) {
  const { fieldId, effectivePlaceholder } = useFormField({
    id: props.id,
    placeholder: props.placeholder,
    required,
    componentPrefix: 'textinput'
  })

  return (
    <FormField label={label} required={required} errorMessage={errorMessage} htmlFor={fieldId}>
      <input
        id={fieldId}
        type={type}
        data-slot='input'
        className={cn(
          'file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className
        )}
        aria-invalid={!!errorMessage}
        {...props}
        placeholder={effectivePlaceholder}
        required={required}
      />
    </FormField>
  )
}
