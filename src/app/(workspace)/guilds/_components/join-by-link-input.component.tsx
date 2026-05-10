'use client'
import LoaderButton from '@/common/loader-button.component'
import Input from '@/ui/input.component'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

function extractToken(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const pathMatch = trimmed.match(/\/guilds\/join\/([^/?#\s]+)/)
  if (pathMatch) return pathMatch[1]

  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed

  return null
}

export default function JoinByLinkInput() {
  const { t } = useTranslation()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const token = extractToken(value)
    if (!token) {
      toast.error(t('guilds.join.invalid_link'))
      return
    }
    startTransition(() => {
      router.push(`/guilds/join/${token}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('guilds.join.paste_placeholder')}
        aria-label={t('guilds.join.paste_label')}
        className="flex-1"
      />
      <LoaderButton
        type="submit"
        variant="outline"
        isLoading={isPending}
        disabled={!value.trim()}
        label={t('guilds.join.paste_cta')}
      />
    </form>
  )
}
