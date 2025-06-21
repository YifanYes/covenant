import { Button } from '@/components/ui/button'
import { Loader2Icon } from 'lucide-react'

export default function LoaderButtton({
  disabled,
  isLoading,
  label,
  onClick
}: {
  disabled: boolean
  isLoading: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button size="sm" disabled={disabled} onClick={onClick}>
      {isLoading && <Loader2Icon className="animate-spin" />}
      {label}
    </Button>
  )
}
