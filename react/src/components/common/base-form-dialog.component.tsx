import LoaderButton from '@/common/loader-button.component'
import Button from '@/ui/button.component'
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/ui/dialog.component'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface BaseFormDialogProps {
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => void
  submitLabel: string
  cancelLabel?: string
  isLoading?: boolean
  isSubmitDisabled?: boolean
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  extraFooterActions?: ReactNode
  className?: string
}

export default function BaseFormDialog({
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  cancelLabel,
  isLoading,
  isSubmitDisabled,
  trigger,
  open,
  onOpenChange,
  extraFooterActions,
  className
}: BaseFormDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{t(title)}</DialogTitle>
          <DialogDescription className={description ? '' : 'sr-only'}>
            {description ? t(description) : t('dialog.default_description')}
          </DialogDescription>
        </DialogHeader>

        {children}

        <DialogFooter className='flex h-auto items-center justify-between gap-2'>
          {extraFooterActions || <div />}
          <div className='flex gap-2'>
            <DialogClose asChild className='hover:bg-foreground/10 cursor-pointer'>
              <Button variant='outline'>{cancelLabel ? t(cancelLabel) : t('cancel')}</Button>
            </DialogClose>
            <LoaderButton
              className='cursor-pointer'
              disabled={isSubmitDisabled}
              isLoading={!!isLoading}
              onClick={onSubmit}
              label={t(submitLabel)}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
