'use client'

import LoaderButton from '@/common/loader-button.component'
import TextInput from '@/forms/text-input.component'
import { authClient } from '@/lib/auth.lib'
import { changeEmailSchema, type ChangeEmailType } from '@/shared/schemas/auth.schemas'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Check, WarningDiamond } from 'pixelarticons/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const RESEND_COOLDOWN_SECONDS = 60

interface EmailSectionProps {
  email: string
  emailVerified: boolean
}

export default function EmailSection({ email, emailVerified }: EmailSectionProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (resendCooldownUntil === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [resendCooldownUntil])

  const cooldownRemaining =
    resendCooldownUntil !== null ? Math.max(0, Math.ceil((resendCooldownUntil - now) / 1000)) : 0
  const resendDisabled = resending || cooldownRemaining > 0

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty, isSubmitting }
  } = useForm<ChangeEmailType>({
    resolver: standardSchemaResolver(changeEmailSchema),
    mode: 'onSubmit',
    defaultValues: { newEmail: '' }
  })

  const onSubmit = async (data: ChangeEmailType) => {
    const { error } = await authClient.changeEmail({
      newEmail: data.newEmail,
      callbackURL: '/profile'
    })
    if (error) {
      toast.error(t('profile.email.change_error'), { description: error.message })
      return
    }
    toast.success(t('profile.email.change_success'))
    setEditing(false)
    reset({ newEmail: '' })
  }

  const onResend = async () => {
    setResending(true)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/profile'
    })
    setResending(false)
    if (error) {
      toast.error(t('profile.email.resend_error'), { description: error.message })
      return
    }
    toast.success(t('profile.email.resend_success'))
    setResendCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">{t('settings.email_label')}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{email}</span>
          {emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
              <Check className="h-3 w-3" />
              {t('profile.email.verified')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              <WarningDiamond className="h-3 w-3" />
              {t('profile.email.unverified')}
            </span>
          )}
        </div>
      </div>

      {!emailVerified && (
        <div>
          <LoaderButton
            type="button"
            onClick={onResend}
            isLoading={resending}
            disabled={resendDisabled}
            variant="outline"
            size="sm"
            className="cursor-pointer"
            label={
              cooldownRemaining > 0
                ? t('profile.email.resend_cooldown', { seconds: cooldownRemaining })
                : t('profile.email.resend_button')
            }
          />
        </div>
      )}

      {!editing && (
        <div>
          <LoaderButton
            type="button"
            onClick={() => setEditing(true)}
            isLoading={false}
            variant="outline"
            size="sm"
            className="cursor-pointer"
            label={t('profile.email.change_button')}
          />
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <TextInput
            type="email"
            label={t('profile.email.new_email_label')}
            disabled={isSubmitting}
            {...register('newEmail')}
            {...(errors.newEmail?.message && {
              errorMessage: t(errors.newEmail.message)
            })}
          />
          <div className="flex gap-2">
            <LoaderButton
              type="submit"
              isLoading={isSubmitting}
              disabled={!isValid || !isDirty}
              variant="outline"
              className="cursor-pointer"
              label={t('save_changes')}
            />
            <LoaderButton
              type="button"
              onClick={() => {
                setEditing(false)
                reset({ newEmail: '' })
              }}
              isLoading={false}
              variant="ghost"
              className="cursor-pointer"
              label={t('cancel')}
            />
          </div>
        </form>
      )}
    </div>
  )
}
