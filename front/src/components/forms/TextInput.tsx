import { cn } from '@/lib/utils'
import { useId, type ComponentProps } from 'react'

interface TextInputProps extends ComponentProps<'input'> {
  errorMessage?: string
  label?: string
  required?: boolean
}

export default function TextInput({ className, type, errorMessage, label, id, required, ...props }: TextInputProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const placeholder = props.placeholder && required ? `${props.placeholder} *` : props.placeholder

  return (
    <div className='w-full space-y-1'>
      {label && (
        <label
          htmlFor={inputId}
          className='mb-1 flex items-center gap-1 pl-0.5 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
        >
          <span>{label}</span>
          {required && <span className='text-destructive leading-none'>*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        data-slot='input'
        className={cn(
          'file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          required ? 'placeholder:text-destructive' : 'placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className
        )}
        aria-invalid={!!errorMessage}
        {...props}
        placeholder={placeholder}
        required={required}
      />
      {errorMessage && (
        <p className='text-destructive text-sm' role='alert'>
          {errorMessage}
        </p>
      )}
    </div>
  )
}
