import { Button } from '@/components/ui/button'
import { Loader2Icon } from 'lucide-react'

export default function LoaderButton({
  disabled,
  isLoading,
  label,
  onClick,
  className
}: {
  disabled: boolean
  isLoading: boolean
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <Button size="sm" disabled={disabled} onClick={onClick} {...(className && { className })}>
      {isLoading && <Loader2Icon className="animate-spin" />}
      {label}
    </Button>
  )
}
