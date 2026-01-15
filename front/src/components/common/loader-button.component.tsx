import { Button } from '@/ui'
import { Loader } from '@nsmr/pixelart-react'

export default function LoaderButton({
  disabled,
  isLoading,
  label,
  onClick,
  className,
  icon
}: {
  disabled?: boolean
  isLoading: boolean
  label: string
  onClick: () => void
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <Button
      size='sm'
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${className || ''}`}
      aria-busy={isLoading}
    >
      {isLoading && <Loader className='animate-spin' />}
      {!isLoading && icon}
      {label}
    </Button>
  )
}
