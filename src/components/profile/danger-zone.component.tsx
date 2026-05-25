'use client'

import { ConfirmDeleteAccountDialog } from '@/common/confirm-delete-account-dialog.component'
import LoaderButton from '@/common/loader-button.component'
import { Delete } from 'pixelarticons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function DangerZone() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="border-destructive/40 flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-destructive font-title text-lg">{t('profile.danger_zone.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('profile.danger_zone.description')}</p>
      </div>
      <div>
        <LoaderButton
          type="button"
          onClick={() => setOpen(true)}
          isLoading={false}
          variant="destructive"
          icon={<Delete />}
          className="cursor-pointer"
          label={t('confirm_delete_account_dialog.button')}
        />
      </div>
      <ConfirmDeleteAccountDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
