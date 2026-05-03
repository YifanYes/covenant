'use client'
import Button from '@/ui/button.component'
import { Loader } from '@nsmr/pixelart-react'

export default function LoaderButton({
  disabled,
  isLoading,
  label,
  onClick,
  size,
  className,
  icon
}: {
  disabled?: boolean
  isLoading: boolean
  label: string
  onClick: () => void
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <Button
      size={size}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${className || ''}`}
      aria-busy={isLoading}
    >
      {isLoading && <Loader className="animate-spin" />}
      {!isLoading && icon}
      {label}
    </Button>
  )
}
