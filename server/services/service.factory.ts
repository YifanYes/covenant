import type { PrismaClient } from '../generated/prisma'
import { ActivityParticipationRepository } from '../repositories/activity-participation.repository'
import { ActivityRepository } from '../repositories/activity.repository'
import { AreaRepository } from '../repositories/area.repository'
import { CharacterRepository } from '../repositories/character.repository'
import { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import { HabitRepository } from '../repositories/habit.repository'
import { InvestmentRepository } from '../repositories/investment.repository'
import { ObjectiveRepository } from '../repositories/objective.repository'
import { TaskRepository } from '../repositories/task.repository'
import { UserRepository } from '../repositories/user.repository'
import { ActivityService } from './activity.service'
import { AreaService } from './area.service'
import { AuthService } from './auth.service'
import { CharacterService } from './character.service'
import { CombatService } from './combat.service'
import { DashboardService } from './dashboard.service'
import { DiceService } from './dice.service'
import { HabitService } from './habit.service'
import { InvestmentService } from './investment.service'
import { ObjectiveService } from './objective.service'
import { StoreService } from './store.services'
import { TaskService } from './task.service'

/**
 * ServiceFactory creates lazily-initialized service instances with proper dependency injection.
 * Repositories are created first, then services are wired with their dependencies.
 * Each instance is created only once per request context.
 */
export class ServiceFactory {
  // Repositories (private, lazy-initialized)
  private _activityParticipationRepository?: ActivityParticipationRepository
  private _activityRepository?: ActivityRepository
  private _areaRepository?: AreaRepository
  private _characterRepository?: CharacterRepository
  private _combatEnemyRepository?: CombatEnemyRepository
  private _habitRepository?: HabitRepository
  private _investmentRepository?: InvestmentRepository
  private _objectiveRepository?: ObjectiveRepository
  private _taskRepository?: TaskRepository
  private _userRepository?: UserRepository

  // Services (private, lazy-initialized)
  private _activityService?: ActivityService
  private _areaService?: AreaService
  private _authService?: AuthService
  private _characterService?: CharacterService
  private _combatService?: CombatService
  private _dashboardService?: DashboardService
  private _diceService?: DiceService
  private _habitService?: HabitService
  private _investmentService?: InvestmentService
  private _objectiveService?: ObjectiveService
  private _storeService?: StoreService
  private _taskService?: TaskService

  constructor(private prisma: PrismaClient) {}

  // ============== Repository Getters (private) ==============

  private get activityParticipationRepository(): ActivityParticipationRepository {
    return (this._activityParticipationRepository ??= new ActivityParticipationRepository(this.prisma))
  }

  private get activityRepository(): ActivityRepository {
    return (this._activityRepository ??= new ActivityRepository(this.prisma))
  }

  private get areaRepository(): AreaRepository {
    return (this._areaRepository ??= new AreaRepository(this.prisma))
  }

  private get characterRepository(): CharacterRepository {
    return (this._characterRepository ??= new CharacterRepository(this.prisma))
  }

  private get combatEnemyRepository(): CombatEnemyRepository {
    return (this._combatEnemyRepository ??= new CombatEnemyRepository(this.prisma))
  }

  private get habitRepository(): HabitRepository {
    return (this._habitRepository ??= new HabitRepository(this.prisma))
  }

  private get investmentRepository(): InvestmentRepository {
    return (this._investmentRepository ??= new InvestmentRepository(this.prisma))
  }

  private get objectiveRepository(): ObjectiveRepository {
    return (this._objectiveRepository ??= new ObjectiveRepository(this.prisma))
  }

  private get taskRepository(): TaskRepository {
    return (this._taskRepository ??= new TaskRepository(this.prisma))
  }

  private get userRepository(): UserRepository {
    return (this._userRepository ??= new UserRepository(this.prisma))
  }

  // ============== Service Getters (public) ==============

  // Layer 1: Repository-only dependencies
  get area(): AreaService {
    return (this._areaService ??= new AreaService(this.areaRepository))
  }

  get character(): CharacterService {
    return (this._characterService ??= new CharacterService(this.characterRepository))
  }

  get dice(): DiceService {
    return (this._diceService ??= new DiceService(this.characterRepository))
  }

  // Layer 2: Repository + Layer 1 service dependencies
  get combat(): CombatService {
    return (this._combatService ??= new CombatService(this.characterRepository, this.activityParticipationRepository))
  }

  get habit(): HabitService {
    return (this._habitService ??= new HabitService(this.habitRepository, this.dice))
  }

  get objective(): ObjectiveService {
    return (this._objectiveService ??= new ObjectiveService(this.objectiveRepository, this.dice))
  }

  get task(): TaskService {
    return (this._taskService ??= new TaskService(this.taskRepository, this.dice))
  }

  // Layer 3: Repository + Layer 2 service dependencies
  get activity(): ActivityService {
    return (this._activityService ??= new ActivityService(
      this.activityRepository,
      this.combatEnemyRepository,
      this.character,
      this.combat
    ))
  }

  get auth(): AuthService {
    return (this._authService ??= new AuthService(
      this.userRepository,
      this.characterRepository,
      this.habitRepository,
      this.taskRepository,
      this.objectiveRepository,
      this.areaRepository
    ))
  }

  get dashboard(): DashboardService {
    return (this._dashboardService ??= new DashboardService(
      this.character,
      this.taskRepository,
      this.habitRepository,
      this.areaRepository,
      this.characterRepository
    ))
  }

  get investment(): InvestmentService {
    return (this._investmentService ??= new InvestmentService(this.investmentRepository, this.characterRepository))
  }

  get store(): StoreService {
    return (this._storeService ??= new StoreService(this.characterRepository, this.character))
  }
}
