import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AreaRepository } from '../../repositories/area.repository'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { HabitRepository } from '../../repositories/habit.repository'
import type { TaskRepository } from '../../repositories/task.repository'
import type { UserTaskStatusRepository } from '../../repositories/user-task-status.repository'
import type { CharacterService } from '../../services/character.service'
import { DashboardService } from '../../services/dashboard.service'
import { createRepoMock } from '../helpers/mock-repo'

const TODO_ID = 'status-todo'
const DOING_ID = 'status-doing'
const DONE_ID = 'status-done'

const seededStatuses = [
  { id: TODO_ID, userId: 'user-1', label: 'TODO', color: 'gray', isDefault: true, createdAt: new Date(), updatedAt: new Date() },
  { id: DOING_ID, userId: 'user-1', label: 'DOING', color: 'blue', isDefault: false, createdAt: new Date(), updatedAt: new Date() },
  { id: DONE_ID, userId: 'user-1', label: 'DONE', color: 'green', isDefault: false, createdAt: new Date(), updatedAt: new Date() }
]

const FAKE_NOW = new Date('2026-05-15T12:00:00Z')

const buildArea = (overrides: Partial<{ id: string; name: string; color: string | null; icon: string | null; objectives: unknown[] }> = {}) => ({
  id: 'area-1',
  name: 'Health',
  color: '#FF0000',
  icon: 'heart',
  objectives: [],
  ...overrides
})

const buildObjective = (overrides: Partial<{ id: string; name: string; tasks: unknown[] }> = {}) => ({
  id: 'obj-1',
  name: 'Run more',
  tasks: [],
  ...overrides
})

const buildDoneTask = (overrides: {
  id?: string
  completedAt?: Date
  updatedAt?: Date
  impact?: string | null
  effort?: string | null
  objectives?: Array<{ id: string; name: string; areas: Array<{ id: string; name: string }> }>
} = {}) => ({
  id: 'task-1',
  title: 'Task title',
  description: null,
  statusId: DONE_ID,
  order: 0,
  dueDate: null,
  userId: 'user-1',
  createdAt: new Date('2026-05-01T00:00:00Z'),
  updatedAt: overrides.updatedAt ?? new Date('2026-05-14T10:00:00Z'),
  color: null,
  effort: 'LOW',
  impact: 'HIGH',
  completedAt: new Date('2026-05-14T10:00:00Z'),
  objectives: [],
  ...overrides
})

describe('DashboardService', () => {
  let mockTaskRepo: ReturnType<typeof createRepoMock<TaskRepository>>
  let mockHabitRepo: ReturnType<typeof createRepoMock<HabitRepository>>
  let mockAreaRepo: ReturnType<typeof createRepoMock<AreaRepository>>
  let mockCharacterRepo: ReturnType<typeof createRepoMock<CharacterRepository>>
  let mockStatusRepo: ReturnType<typeof createRepoMock<UserTaskStatusRepository>>
  let mockCharacterService: ReturnType<typeof createRepoMock<CharacterService>>
  let dashboardService: DashboardService

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FAKE_NOW)

    mockTaskRepo = createRepoMock<TaskRepository>()
    mockHabitRepo = createRepoMock<HabitRepository>()
    mockAreaRepo = createRepoMock<AreaRepository>()
    mockCharacterRepo = createRepoMock<CharacterRepository>()
    mockStatusRepo = createRepoMock<UserTaskStatusRepository>()
    mockCharacterService = createRepoMock<CharacterService>()

    mockTaskRepo.countByStatusIds.mockResolvedValue(0)
    mockTaskRepo.countUpcoming.mockResolvedValue(0)
    mockTaskRepo.findUpcoming.mockResolvedValue([])
    mockTaskRepo.findCompletedWithObjectives.mockResolvedValue([])
    mockHabitRepo.findCompletionsByDate.mockResolvedValue([])
    mockHabitRepo.findCompletionsWithAreas.mockResolvedValue([])
    mockHabitRepo.findAllWithLastCompletion.mockResolvedValue([])
    mockAreaRepo.findWithHierarchy.mockResolvedValue([])
    mockCharacterRepo.findWithClasses.mockResolvedValue(null)
    mockStatusRepo.findAll.mockResolvedValue(seededStatuses)

    dashboardService = new DashboardService(
      mockCharacterService as unknown as CharacterService,
      mockTaskRepo as unknown as TaskRepository,
      mockHabitRepo as unknown as HabitRepository,
      mockAreaRepo as unknown as AreaRepository,
      mockCharacterRepo as unknown as CharacterRepository,
      mockStatusRepo as unknown as UserTaskStatusRepository
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getDashboardData — full shape', () => {
    it('returns expected DashboardData for representative input', async () => {
      const today = new Date('2026-05-15T10:00:00Z')

      mockTaskRepo.countByStatusIds
        .mockResolvedValueOnce(1) // OVERDUE
        .mockResolvedValueOnce(2) // DOING
        .mockResolvedValueOnce(3) // TODO
      mockTaskRepo.countUpcoming.mockResolvedValue(1)
      mockTaskRepo.findUpcoming.mockResolvedValue([
        {
          id: 'up-1',
          title: 'Upcoming',
          description: null,
          statusId: TODO_ID,
          order: 0,
          dueDate: today,
          userId: 'user-1',
          createdAt: today,
          updatedAt: today,
          color: null,
          effort: null,
          impact: null,
          completedAt: null,
          areas: [{ color: '#FF0000' }]
        }
      ] as never)

      mockHabitRepo.findCompletionsByDate.mockResolvedValue([
        {
          id: 'h-1',
          name: 'Drink water',
          timespan: 'DAILY',
          recurrence: 1,
          completions: [{ completedAt: today }]
        }
      ] as never)
      mockHabitRepo.findCompletionsWithAreas.mockResolvedValue([
        {
          id: 'h-1',
          completions: [{ completedAt: today }],
          objectives: [{ areas: [{ id: 'area-1' }] }]
        }
      ] as never)
      mockHabitRepo.findAllWithLastCompletion.mockResolvedValue([
        { name: 'Drink water', completions: [{ completedAt: today }] }
      ] as never)

      mockTaskRepo.findCompletedWithObjectives.mockResolvedValue([
        buildDoneTask({
          id: 'task-1',
          completedAt: today,
          impact: 'HIGH',
          effort: 'LOW',
          objectives: [{ id: 'obj-1', name: 'Run more', areas: [{ id: 'area-1', name: 'Health' }] }]
        })
      ] as never)

      mockAreaRepo.findWithHierarchy.mockResolvedValue([
        buildArea({ objectives: [buildObjective()] })
      ] as never)

      mockCharacterRepo.findWithClasses.mockResolvedValue({ name: 'Hero', gold: 100 } as never)
      mockCharacterService.getCharacterProgress.mockReturnValue({
        currentClass: { health: 50, maxHealth: 100, mana: 30, maxMana: 80 },
        manaReserve: 5
      } as never)

      const result = await dashboardService.getDashboardData('user-1', 0)

      expect(result.characterName).toBe('Hero')
      expect(result.character).toEqual({
        gold: 100,
        manaReserve: 5,
        health: 50,
        maxHealth: 100,
        mana: 30,
        maxMana: 80
      })
      expect(result.statusStats).toEqual({ TODO: 3, DOING: 2, OVERDUE: 1 })
      expect(result.upcomingTasks).toHaveLength(1)
      expect(result.upcomingTasks[0]).toMatchObject({ id: 'up-1', areaColor: '#FF0000' })
      expect(result.habitsMetrics).toEqual({
        completedToday: 1,
        totalDaily: 1,
        incompleteDaily: []
      })
      expect(result.efficiencyMetrics.mostCommonType).toBe('QUICK_WIN')
      expect(result.efficiencyMetrics.mostFocusedArea).toBe('Health')
      expect(result.efficiencyMetrics.mostFocusedObjective).toBe('Run more')
      expect(result.taskMetrics.areas).toHaveLength(1)
      expect(result.taskMetrics.areas[0]).toMatchObject({
        name: 'Health',
        color: '#FF0000',
        icon: 'heart',
        tasksThisMonth: 1,
        tasksLastMonth: 0,
        habitsThisMonth: 1,
        habitsLastMonth: 0
      })
      expect(result.taskMetrics.objectives).toHaveLength(1)
      expect(result.taskMetrics.objectives[0]).toMatchObject({ name: 'Run more' })
      expect(result.taskMetrics.habits).toEqual([
        { name: 'Drink water', lastCompletion: today.toISOString() }
      ])
      expect(result.summary).toEqual({ dueSoonCount: 1, neglectedCount: 0 })
      expect(result.completionsTrend).toHaveLength(14)
    })
  })

  describe('getActiveAreasAndObjectives via getDashboardData', () => {
    const mayCompletion = new Date('2026-05-10T10:00:00Z') // current month
    const aprCompletion = new Date('2026-04-10T10:00:00Z') // previous month

    it('counts a task in 2 objectives under same area exactly once', async () => {
      mockAreaRepo.findWithHierarchy.mockResolvedValue([
        buildArea({
          id: 'a1',
          objectives: [buildObjective({ id: 'o1', name: 'Obj1' }), buildObjective({ id: 'o2', name: 'Obj2' })]
        })
      ] as never)
      mockTaskRepo.findCompletedWithObjectives.mockResolvedValue([
        buildDoneTask({
          id: 't1',
          completedAt: mayCompletion,
          objectives: [
            { id: 'o1', name: 'Obj1', areas: [{ id: 'a1', name: 'Health' }] },
            { id: 'o2', name: 'Obj2', areas: [{ id: 'a1', name: 'Health' }] }
          ]
        })
      ] as never)

      const result = await dashboardService.getDashboardData('user-1', 0)

      expect(result.taskMetrics.areas).toHaveLength(1)
      expect(result.taskMetrics.areas[0].tasksThisMonth).toBe(1)
      expect(result.taskMetrics.areas[0].tasksLastMonth).toBe(0)
      expect(result.taskMetrics.objectives.every((o) => o.lastCompletion !== null)).toBe(true)
    })

    it('counts a task in 2 objectives across different areas once per area', async () => {
      mockAreaRepo.findWithHierarchy.mockResolvedValue([
        buildArea({ id: 'a1', name: 'A1', objectives: [buildObjective({ id: 'o1', name: 'Obj1' })] }),
        buildArea({ id: 'a2', name: 'A2', objectives: [buildObjective({ id: 'o2', name: 'Obj2' })] })
      ] as never)
      mockTaskRepo.findCompletedWithObjectives.mockResolvedValue([
        buildDoneTask({
          id: 't1',
          completedAt: mayCompletion,
          objectives: [
            { id: 'o1', name: 'Obj1', areas: [{ id: 'a1', name: 'A1' }] },
            { id: 'o2', name: 'Obj2', areas: [{ id: 'a2', name: 'A2' }] }
          ]
        })
      ] as never)

      const result = await dashboardService.getDashboardData('user-1', 0)

      const byId = Object.fromEntries(result.taskMetrics.areas.map((a) => [a.name, a]))
      expect(byId.A1.tasksThisMonth).toBe(1)
      expect(byId.A2.tasksThisMonth).toBe(1)
    })

    it('counts toward both areas when an objective belongs to two areas', async () => {
      mockAreaRepo.findWithHierarchy.mockResolvedValue([
        buildArea({ id: 'a1', name: 'A1', objectives: [buildObjective({ id: 'o1', name: 'Obj1' })] }),
        buildArea({ id: 'a2', name: 'A2', objectives: [buildObjective({ id: 'o1', name: 'Obj1' })] })
      ] as never)
      mockTaskRepo.findCompletedWithObjectives.mockResolvedValue([
        buildDoneTask({
          id: 't1',
          completedAt: mayCompletion,
          objectives: [
            {
              id: 'o1',
              name: 'Obj1',
              areas: [
                { id: 'a1', name: 'A1' },
                { id: 'a2', name: 'A2' }
              ]
            }
          ]
        })
      ] as never)

      const result = await dashboardService.getDashboardData('user-1', 0)

      const byName = Object.fromEntries(result.taskMetrics.areas.map((a) => [a.name, a]))
      expect(byName.A1.tasksThisMonth).toBe(1)
      expect(byName.A2.tasksThisMonth).toBe(1)
    })

    it('uses completedAt not updatedAt for month bucketing', async () => {
      mockAreaRepo.findWithHierarchy.mockResolvedValue([
        buildArea({ id: 'a1', objectives: [buildObjective({ id: 'o1' })] })
      ] as never)
      mockTaskRepo.findCompletedWithObjectives.mockResolvedValue([
        buildDoneTask({
          id: 't1',
          updatedAt: aprCompletion, // edited last month
          completedAt: mayCompletion, // actually completed this month
          objectives: [{ id: 'o1', name: 'Obj1', areas: [{ id: 'a1', name: 'A1' }] }]
        })
      ] as never)

      const result = await dashboardService.getDashboardData('user-1', 0)

      expect(result.taskMetrics.areas[0].tasksThisMonth).toBe(1)
      expect(result.taskMetrics.areas[0].tasksLastMonth).toBe(0)
    })

    it('counts a habit linked to multiple areas once per area regardless of completion count', async () => {
      mockAreaRepo.findWithHierarchy.mockResolvedValue([
        buildArea({ id: 'a1', name: 'A1' }),
        buildArea({ id: 'a2', name: 'A2' })
      ] as never)
      mockHabitRepo.findCompletionsWithAreas.mockResolvedValue([
        {
          id: 'h1',
          objectives: [
            {
              areas: [{ id: 'a1' }, { id: 'a2' }]
            }
          ],
          completions: [
            { completedAt: new Date('2026-05-02T10:00:00Z') },
            { completedAt: new Date('2026-05-07T10:00:00Z') },
            { completedAt: new Date('2026-05-12T10:00:00Z') }
          ]
        }
      ] as never)

      const result = await dashboardService.getDashboardData('user-1', 0)

      const byName = Object.fromEntries(result.taskMetrics.areas.map((a) => [a.name, a]))
      expect(byName.A1.habitsThisMonth).toBe(1)
      expect(byName.A2.habitsThisMonth).toBe(1)
    })

    it('returns empty arrays and zero neglectedCount when no data', async () => {
      const result = await dashboardService.getDashboardData('user-1', 0)

      expect(result.taskMetrics.areas).toEqual([])
      expect(result.taskMetrics.objectives).toEqual([])
      expect(result.taskMetrics.habits).toEqual([])
      expect(result.summary.neglectedCount).toBe(0)
    })

    it('calls findCompletedWithObjectives with prev-month-start cutoff', async () => {
      await dashboardService.getDashboardData('user-1', 0)

      const expectedCutoff = dayjs(FAKE_NOW).startOf('month').subtract(1, 'month').toDate()
      expect(mockTaskRepo.findCompletedWithObjectives).toHaveBeenCalledWith('user-1', expectedCutoff)
    })

    it('flags stale area, objective, and habit in neglectedCount', async () => {
      mockAreaRepo.findWithHierarchy.mockResolvedValue([
        buildArea({ id: 'a1', objectives: [buildObjective({ id: 'o1' })] })
      ] as never)
      mockHabitRepo.findAllWithLastCompletion.mockResolvedValue([
        { name: 'Stale habit', completions: [{ completedAt: new Date('2025-01-01T00:00:00Z') }] }
      ] as never)

      const result = await dashboardService.getDashboardData('user-1', 0)

      expect(result.summary.neglectedCount).toBe(3)
    })
  })

  describe('completionsTrend timezone bucketing', () => {
    it('buckets a UTC 00:30 completion into the previous user-local day when offset is +300 (UTC-5)', async () => {
      const completion = new Date('2026-05-15T00:30:00Z') // UTC May 15 00:30 = May 14 19:30 in UTC-5
      mockTaskRepo.findCompletedWithObjectives.mockResolvedValue([
        buildDoneTask({ id: 't1', completedAt: completion, objectives: [] })
      ] as never)

      const result = await dashboardService.getDashboardData('user-1', 300)

      const day14 = result.completionsTrend.find((p) => p.date === '2026-05-14')
      const day15 = result.completionsTrend.find((p) => p.date === '2026-05-15')
      expect(day14?.count).toBe(1)
      expect(day15?.count).toBe(0)
    })

    it('buckets the same completion into the UTC day when offset is 0', async () => {
      const completion = new Date('2026-05-15T00:30:00Z')
      mockTaskRepo.findCompletedWithObjectives.mockResolvedValue([
        buildDoneTask({ id: 't1', completedAt: completion, objectives: [] })
      ] as never)

      const result = await dashboardService.getDashboardData('user-1', 0)

      const day15 = result.completionsTrend.find((p) => p.date === '2026-05-15')
      const day14 = result.completionsTrend.find((p) => p.date === '2026-05-14')
      expect(day15?.count).toBe(1)
      expect(day14?.count).toBe(0)
    })
  })
})
