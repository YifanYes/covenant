import { queryClient, trpcOptions } from './trpc.utils'

type MonthIndexParams = { monthIndex: string; year: string }

/**
 * Centralized query invalidation utilities.
 * Use these instead of scattering invalidateQueries calls across components.
 */
export const invalidators = {
  /**
   * Invalidate all task-related queries.
   * Use after creating, updating, or deleting tasks.
   */
  tasks: async (monthIndex?: MonthIndexParams) => {
    const promises = [
      queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getAll.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getFiltered.queryKey() })
    ]
    if (monthIndex) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: trpcOptions.tasks.getByDate.queryKey(monthIndex)
        })
      )
    }
    await Promise.all(promises)
  },

  /**
   * Invalidate all habit-related queries.
   * Use after creating, updating, completing, or deleting habits.
   */
  habits: async () => {
    await queryClient.invalidateQueries({ queryKey: trpcOptions.habits.getAll.queryKey() })
  },

  /**
   * Invalidate all objective-related queries.
   * Use after creating, updating, completing, or deleting objectives.
   */
  objectives: async () => {
    await queryClient.invalidateQueries({ queryKey: trpcOptions.objectives.getAll.queryKey() })
  },

  /**
   * Invalidate all area-related queries.
   * Use after creating, updating, or deleting areas.
   */
  areas: async () => {
    await queryClient.invalidateQueries({ queryKey: trpcOptions.areas.getAll.queryKey() })
  },

  /**
   * Invalidate character-related queries.
   * Use after equipping items, using consumables, or any character state change.
   */
  character: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.get.queryKey() })
    ])
  },

  /**
   * Invalidate doctrine-related queries.
   * Use after equipping or unequipping doctrines.
   */
  doctrines: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.equippedDoctrines.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getAvailableDoctrines.queryKey() })
    ])
  },

  /**
   * Invalidate combat-related queries.
   * Use after combat actions like attacks, moves, or enemy turns.
   */
  combat: async (participationId?: string) => {
    const promises = [
      queryClient.invalidateQueries({ queryKey: trpcOptions.activity.list.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    ]
    if (participationId) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: trpcOptions.activity.getTacticalState.queryKey({ participationId })
        })
      )
    }
    await Promise.all(promises)
  },

  /**
   * Invalidate store/shop-related queries.
   * Use after purchasing items.
   */
  store: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpcOptions.store.list.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    ])
  },

}
