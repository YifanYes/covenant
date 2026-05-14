'use client'
import AlertDialog, {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/ui/alert-dialog.component'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import LoaderButton from './loader-button.component'

interface BaseConfirmDialogProps {
  title: string
  description?: string
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  variant?: 'default' | 'destructive'
  confirmClassName?: string
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  contentClassName?: string
}

export default function BaseConfirmDialog({
  title,
  description,
  onConfirm,
  confirmLabel,
  cancelLabel,
  isLoading,
  variant = 'destructive',
  confirmClassName,
  trigger,
  open,
  onOpenChange,
  contentClassName
}: BaseConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className={contentClassName}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(title)}</AlertDialogTitle>
          <AlertDialogDescription>{description ? t(description) : null}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:bg-foreground/10 cursor-pointer">
            {cancelLabel ? t(cancelLabel) : t('cancel')}
          </AlertDialogCancel>
          <LoaderButton
            className={
              confirmClassName ||
              (variant === 'destructive'
                ? 'text-destructive hover:text-foreground hover:bg-foreground/10 cursor-pointer bg-transparent'
                : 'cursor-pointer')
            }
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={!!isLoading}
            label={confirmLabel ? t(confirmLabel) : t('confirm')}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
