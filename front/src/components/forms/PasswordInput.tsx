import { cn } from '@/lib/utils'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useId, useState, type ComponentProps } from 'react'
import { Button } from '../ui/button'

type PasswordInputProps = ComponentProps<'input'> & {
  errorMessage?: string
  label?: string
  required?: boolean
}

export default function PasswordInput({ className, errorMessage, label, id, required, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const generatedId = useId()
  const inputId = id || generatedId
  const placeholder = props.placeholder && required ? `${props.placeholder} *` : props.placeholder

  return (
    <div className='w-full space-y-1'>
      {label && (
        <label
          htmlFor={inputId}
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
        >
          {label}
          {required && <span className='text-destructive ml-1'>*</span>}
        </label>
      )}
      <div className='relative'>
        <input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          data-slot='input'
          aria-invalid={!!errorMessage}
          className={cn(
            'file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            required ? 'placeholder:text-destructive' : 'placeholder:text-muted-foreground',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            className
          )}
          {...props}
          placeholder={placeholder}
          required={required}
        />
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-icon hover:text-icon-hover absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent'
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? (
            <EyeIcon className='h-4 w-4' aria-hidden='true' />
          ) : (
            <EyeOffIcon className='h-4 w-4' aria-hidden='true' />
          )}
        </Button>
      </div>
      {errorMessage && <p className='text-destructive text-sm'>{errorMessage}</p>}
    </div>
  )
}
