'use client'

import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const UNASSIGNED = '__unassigned__'

interface MemberTitleSelectProps {
  guildId: string
  memberId: string
  currentTitle: string | null
  availableTitles: string[]
  disabled?: boolean
}

export default function MemberTitleSelect({
  guildId,
  memberId,
  currentTitle,
  availableTitles,
  disabled
}: MemberTitleSelectProps) {
  const { t } = useTranslation()

  const mutation = useMutation(
    trpcOptions.guilds.updateMemberTitle.mutationOptions({
      onSuccess: async () => {
        toast.success(t('guilds.member_title.success'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
      },
      onError: (error) => toast.error(t('guilds.member_title.error'), { description: error.message })
    })
  )

  const value = currentTitle && availableTitles.includes(currentTitle) ? currentTitle : UNASSIGNED

  const handleChange = (next: string) => {
    const title = next === UNASSIGNED ? null : next
    mutation.mutate({ guildId, memberId, title })
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled || mutation.isPending}>
      <SelectTrigger size="sm" className="h-7 text-xs">
        <SelectValue placeholder={t('guilds.member_title.assign')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>{t('guilds.member_title.unassigned')}</SelectItem>
        {availableTitles.map((title) => (
          <SelectItem key={title} value={title}>
            {title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
