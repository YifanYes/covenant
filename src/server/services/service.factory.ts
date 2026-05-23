import type { PrismaClient } from '@/generated/prisma'
import { AreaRepository } from '../repositories/area.repository'
import { CharacterQuestRepository } from '../repositories/character-quest.repository'
import { CharacterRepository } from '../repositories/character.repository'
import { CombatEnemyRepository } from '../repositories/combat-enemy.repository'
import { GuildInviteRepository } from '../repositories/guild-invite.repository'
import { GuildMemberRepository } from '../repositories/guild-member.repository'
import { GuildMessageRepository } from '../repositories/guild-message.repository'
import { GuildRepository } from '../repositories/guild.repository'
import { HabitRepository } from '../repositories/habit.repository'
import { JournalRepository } from '../repositories/journal.repository'
import { ObjectiveRepository } from '../repositories/objective.repository'
import { TaskRepository } from '../repositories/task.repository'
import { TavernMessageRepository } from '../repositories/tavern-message.repository'
import { UserRepository } from '../repositories/user.repository'
import { UserTaskStatusRepository } from '../repositories/user-task-status.repository'
import { AreaService } from './area.service'
import { AuthService } from './auth.service'
import { CharacterService } from './character.service'
import { CombatService } from './combat.service'
import { DashboardService } from './dashboard.service'
import { GuildService } from './guild.service'
import { HabitService } from './habit.service'
import { JournalService } from './journal.service'
import { KillRecordService } from './kill-record.service'
import { ManaService } from './mana.service'
import { ObjectiveService } from './objective.service'
import { QuestService } from './quest.service'
import { StoreService } from './store.services'
import { TaskService } from './task.service'
import { TavernService } from './tavern.service'
import { UserTaskStatusService } from './user-task-status.service'

/**
 * ServiceFactory creates lazily-initialized service instances with proper dependency injection.
 * Repositories are created first, then services are wired with their dependencies.
 * Each instance is created only once per request context.
 */
export class ServiceFactory {
  // Repositories (private, lazy-initialized)
  private _characterQuestRepository?: CharacterQuestRepository
  private _areaRepository?: AreaRepository
  private _characterRepository?: CharacterRepository
  private _combatEnemyRepository?: CombatEnemyRepository
  private _guildRepository?: GuildRepository
  private _guildMemberRepository?: GuildMemberRepository
  private _guildMessageRepository?: GuildMessageRepository
  private _guildInviteRepository?: GuildInviteRepository
  private _habitRepository?: HabitRepository
  private _journalRepository?: JournalRepository
  private _objectiveRepository?: ObjectiveRepository
  private _taskRepository?: TaskRepository
  private _tavernMessageRepository?: TavernMessageRepository
  private _userRepository?: UserRepository
  private _userTaskStatusRepository?: UserTaskStatusRepository

  // Services (private, lazy-initialized)
  private _areaService?: AreaService
  private _authService?: AuthService
  private _characterService?: CharacterService
  private _combatService?: CombatService
  private _dashboardService?: DashboardService
  private _guildService?: GuildService
  private _habitService?: HabitService
  private _journalService?: JournalService
  private _killRecordService?: KillRecordService
  private _manaService?: ManaService
  private _objectiveService?: ObjectiveService
  private _questService?: QuestService
  private _storeService?: StoreService
  private _taskService?: TaskService
  private _tavernService?: TavernService
  private _userTaskStatusService?: UserTaskStatusService

  constructor(private prisma: PrismaClient) {}

  // ============== Repository Getters (private) ==============

  private get characterQuestRepository(): CharacterQuestRepository {
    return (this._characterQuestRepository ??= new CharacterQuestRepository(this.prisma))
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

  private get guildRepository(): GuildRepository {
    return (this._guildRepository ??= new GuildRepository(this.prisma))
  }

  private get guildMemberRepository(): GuildMemberRepository {
    return (this._guildMemberRepository ??= new GuildMemberRepository(this.prisma))
  }

  private get guildMessageRepository(): GuildMessageRepository {
    return (this._guildMessageRepository ??= new GuildMessageRepository(this.prisma))
  }

  private get guildInviteRepository(): GuildInviteRepository {
    return (this._guildInviteRepository ??= new GuildInviteRepository(this.prisma))
  }

  private get habitRepository(): HabitRepository {
    return (this._habitRepository ??= new HabitRepository(this.prisma))
  }

  private get journalRepository(): JournalRepository {
    return (this._journalRepository ??= new JournalRepository(this.prisma))
  }

  private get objectiveRepository(): ObjectiveRepository {
    return (this._objectiveRepository ??= new ObjectiveRepository(this.prisma))
  }

  private get taskRepository(): TaskRepository {
    return (this._taskRepository ??= new TaskRepository(this.prisma))
  }

  private get tavernMessageRepository(): TavernMessageRepository {
    return (this._tavernMessageRepository ??= new TavernMessageRepository(this.prisma))
  }

  private get userRepository(): UserRepository {
    return (this._userRepository ??= new UserRepository(this.prisma))
  }

  private get userTaskStatusRepository(): UserTaskStatusRepository {
    return (this._userTaskStatusRepository ??= new UserTaskStatusRepository(this.prisma))
  }

  // ============== Service Getters (public) ==============

  // Layer 1: Repository-only dependencies
  get area(): AreaService {
    return (this._areaService ??= new AreaService(this.areaRepository))
  }

  get character(): CharacterService {
    return (this._characterService ??= new CharacterService(this.characterRepository, this.userRepository, this.mana))
  }

  get mana(): ManaService {
    return (this._manaService ??= new ManaService(this.characterRepository, this.prisma))
  }

  // Layer 2: Repository + Layer 1 service dependencies
  get combat(): CombatService {
    return (this._combatService ??= new CombatService(
      this.characterRepository,
      this.characterQuestRepository,
      this.character,
      this.combatEnemyRepository,
      this.killRecord,
      undefined,
      this.prisma,
      this.guild
    ))
  }

  get guild(): GuildService {
    return (this._guildService ??= new GuildService(
      this.prisma,
      this.guildRepository,
      this.guildMemberRepository,
      this.guildMessageRepository,
      this.guildInviteRepository,
      this.userRepository,
      this.characterRepository
    ))
  }

  get habit(): HabitService {
    return (this._habitService ??= new HabitService(this.habitRepository, this.mana, this.guild))
  }

  get journal(): JournalService {
    return (this._journalService ??= new JournalService(this.prisma, this.journalRepository, this.mana))
  }

  get objective(): ObjectiveService {
    return (this._objectiveService ??= new ObjectiveService(this.objectiveRepository, this.mana))
  }

  get task(): TaskService {
    return (this._taskService ??= new TaskService(
      this.taskRepository,
      this.userTaskStatusRepository,
      this.mana,
      this.guild
    ))
  }

  get userTaskStatus(): UserTaskStatusService {
    return (this._userTaskStatusService ??= new UserTaskStatusService(this.userTaskStatusRepository))
  }

  get tavern(): TavernService {
    return (this._tavernService ??= new TavernService(
      this.prisma,
      this.tavernMessageRepository,
      this.characterRepository
    ))
  }

  // Layer 3: Repository + Layer 2 service dependencies
  get auth(): AuthService {
    return (this._authService ??= new AuthService(this.prisma, this.userRepository))
  }

  get dashboard(): DashboardService {
    return (this._dashboardService ??= new DashboardService(
      this.character,
      this.taskRepository,
      this.habitRepository,
      this.areaRepository,
      this.characterRepository,
      this.userTaskStatusRepository
    ))
  }

  get killRecord(): KillRecordService {
    return (this._killRecordService ??= new KillRecordService(this.characterRepository, this.combatEnemyRepository))
  }

  get quest(): QuestService {
    return (this._questService ??= new QuestService(
      this.characterQuestRepository,
      this.combatEnemyRepository,
      this.character,
      this.mana
    ))
  }

  get store(): StoreService {
    return (this._storeService ??= new StoreService(this.characterRepository, this.character, this.guild))
  }
}
