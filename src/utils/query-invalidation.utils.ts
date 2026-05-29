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
      queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getFiltered.queryKey() }),
      // Phase 2A: completing a task grants mana; sidebar/dashboard indicators must refresh.
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getTodayReserveBreakdown.queryKey() })
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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpcOptions.habits.getAll.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.dashboard.get.queryKey() }),
      // Phase 2A: habit completion grants mana; surface live in sidebar.
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getTodayReserveBreakdown.queryKey() })
    ])
  },

  /**
   * Invalidate all objective-related queries.
   * Use after creating, updating, completing, or deleting objectives.
   */
  objectives: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpcOptions.objectives.getAll.queryKey() }),
      // Phase 2A: completing an objective grants mana.
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getTodayReserveBreakdown.queryKey() })
    ])
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
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.get.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getTodayReserveBreakdown.queryKey() })
    ])
  },

  /**
   * Invalidate ability-related queries.
   * Use after equipping or unequipping abilities.
   */
  abilities: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.equippedAbilities.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getAvailableAbilities.queryKey() })
    ])
  },

  /**
   * Invalidate combat-related queries.
   * Use after combat actions like attacks, moves, or enemy turns.
   */
  combat: async (questId?: string) => {
    const promises = [
      queryClient.invalidateQueries({ queryKey: trpcOptions.quest.list.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getTodayReserveBreakdown.queryKey() })
    ]
    if (questId) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: trpcOptions.quest.getTacticalState.queryKey({ questPublicId: questId })
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
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getTodayReserveBreakdown.queryKey() })
    ])
  }
}
