import type { SupabaseClient } from '@supabase/supabase-js'
import type { PrismaClient } from '../generated/prisma'
import { AreaService } from './area.service'
import { AuthService } from './auth.service'
import { CharacterService } from './character.service'
import { CombatService } from './combat.service'
import { DashboardService } from './dashboard.service'
import { DiceService } from './dice.service'
import { HabitService } from './habit.service'

import { ActivityService } from './activity.service'
import { MapService } from './map.service'
import { ObjectiveService } from './objective.service'
import { StoreService } from './store.services'
import { TaskService } from './task.service'

/**
 * ServiceFactory creates lazily-initialized service instances.
 * Each service is created only once per request context.
 */
export class ServiceFactory {
  private _areaService?: AreaService
  private _authService?: AuthService
  private _characterService?: CharacterService
  private _combatService?: CombatService
  private _dashboardService?: DashboardService
  private _diceService?: DiceService
  private _habitService?: HabitService
  private _objectiveService?: ObjectiveService
  private _taskService?: TaskService
  private _storeService?: StoreService
  private _activityService?: ActivityService
  private _mapService?: MapService

  constructor(
    private prisma: PrismaClient,
    private supabase: SupabaseClient
  ) {}

  get area(): AreaService {
    if (!this._areaService) {
      this._areaService = new AreaService(this.prisma)
    }
    return this._areaService
  }

  get auth(): AuthService {
    if (!this._authService) {
      this._authService = new AuthService(this.prisma, this.supabase)
    }
    return this._authService
  }

  get character(): CharacterService {
    if (!this._characterService) {
      this._characterService = new CharacterService(this.prisma)
    }
    return this._characterService
  }

  get combat(): CombatService {
    if (!this._combatService) {
      this._combatService = new CombatService(this.prisma)
    }
    return this._combatService
  }

  get dashboard(): DashboardService {
    if (!this._dashboardService) {
      this._dashboardService = new DashboardService(this.prisma)
    }
    return this._dashboardService
  }

  get dice(): DiceService {
    if (!this._diceService) {
      this._diceService = new DiceService(this.prisma)
    }
    return this._diceService
  }

  get habit(): HabitService {
    if (!this._habitService) {
      this._habitService = new HabitService(this.prisma)
    }
    return this._habitService
  }

  get objective(): ObjectiveService {
    if (!this._objectiveService) {
      this._objectiveService = new ObjectiveService(this.prisma)
    }
    return this._objectiveService
  }

  get task(): TaskService {
    if (!this._taskService) {
      this._taskService = new TaskService(this.prisma)
    }
    return this._taskService
  }

  get store(): StoreService {
    if (!this._storeService) {
      this._storeService = new StoreService(this.prisma)
    }
    return this._storeService
  }

  get activity(): ActivityService {
    if (!this._activityService) {
      this._activityService = new ActivityService(this.prisma)
    }
    return this._activityService
  }

  get map(): MapService {
    if (!this._mapService) {
      this._mapService = new MapService(this.prisma)
    }
    return this._mapService
  }
}
