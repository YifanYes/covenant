'use client'
import { useCalendarStore } from '@/stores/calendar.store'
import { invalidators } from '@/utils/query-invalidation.utils'
import { getRewardText } from '@/utils/text.utils'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useDebouncedMutation } from './use-debounced-mutation'

const REORDER_DEBOUNCE_MS = 1400

export const useReorderTasksMutation = () => {
  const { t } = useTranslation()
  const { monthIndex } = useCalendarStore()

  return useDebouncedMutation(
    trpcOptions.tasks.bulkUpdate.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({
          queryKey: trpcOptions.tasks.getByDate.queryKey({
            monthIndex: monthIndex.toString(),
            year: dayjs().year().toString()
          })
        })
        if (result.manaEarned > 0 || result.reserveGained > 0) {
          await invalidators.character()
          await queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getAll.queryKey() })
          toast.success(
            t('tasks.success.update', { manaReward: getRewardText(result.manaEarned, result.reserveGained) })
          )
        }
      },
      onError: (error) => toast.error(t('tasks.error.internal.reorder'), { description: error.message })
    }),
    REORDER_DEBOUNCE_MS
  )
}

export type ReorderTasksMutation = ReturnType<typeof useReorderTasksMutation>
