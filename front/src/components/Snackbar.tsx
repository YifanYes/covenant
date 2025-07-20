import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useSnackbar } from '@/hooks/useSnackbar'

export default function Snackbar() {
  const { open, variant, title, description } = useSnackbar()

  if (!open) return null

  return (
    <div className='fixed top-4 right-4 z-50 w-96 max-w-sm'>
      <Alert variant={variant}>
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
      </Alert>
    </div>
  )
}
