'use client'
import Button from '@/ui/button.component'
import { Loader } from 'pixelarticons/react'
import type { ComponentProps, ReactNode } from 'react'

type ButtonProps = ComponentProps<typeof Button>

interface LoaderButtonProps extends Omit<ButtonProps, 'children'> {
  isLoading: boolean
  label?: string
  icon?: ReactNode
}

export default function LoaderButton({
  disabled,
  isLoading,
  label,
  icon,
  ...rest
}: LoaderButtonProps) {
  return (
    <Button {...rest} disabled={disabled || isLoading} aria-busy={isLoading}>
      {isLoading ? <Loader className="animate-spin" /> : icon}
      {label}
    </Button>
  )
}
