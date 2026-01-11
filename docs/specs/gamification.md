# Gamification Technical Specification

## Overview

This document outlines the technical specification for implementing the initial gamification layer in ARQ. The goal is to transform the user's productivity (completing tasks/habits/objectives) into in-game progress (combat, leveling).

## Progression Models

We will implement different mechanics for character progression to ensure users engage with all app features, but the system should support the core loop common to all.

- Efficiency Scaling (Classic RPG)
  - Leveling up increases Gold/XP multipliers.
  - Better Gear = Higher multipliers.
- Doctrines (Abilities and Spells)
  - Leveling unlocks Doctrine slots.
- Gating & Preparation
  - Level Gating: Must be Tier X to enter Tier X missions.
  - Loop: Complete tasks/habits -> Get dice -> Enter Adventure -> Defeat enemies -> Level up/Get Gear.

## Core Loop

1.  **Action**: User completes a Task, Habit or Objective.
2.  **Reward**: User gains Dice Rolls.
3.  **Conflict**: User spends Dice in the Adventure tab to complete a Mission.
4.  **Loot**: If mission is successful, User gets gold, XP and items.
5.  **Equip**: User uses gold to buy or finds Equipment to improve stats. (Crafting moved to roadmap). Gold can be used to make decisions that impact the story.

## Dice-Based Combat System

Combat uses the board game's dice mechanics, where completing tasks, habits and objectives earns dice rolls that can be spent to attack enemies in the **Adventure** tab. Combat is **Reactive**: when the user attacks, the enemy defends and counter-attacks simultaneously. This is designed to be fast and engaging, with the goal of making the user feel like they are part of the story.

### Dice Economy

#### Earning Dice

| User Action (Trigger)         | Dice Earned | Notes                                                           |
| :---------------------------- | :---------: | :-------------------------------------------------------------- |
| Complete **Habit**            |      2      | Bonus dice for consecutive daily completion (consistency bonus) |
| Complete **Low Impact Task**  |      2      |                                                                 |
| Complete **High Impact Task** |      4      |                                                                 |
| Complete **Objective**        |      6      |                                                                 |
| **Daily Login Bonus**         |  Variable   | Based on character tier (encourages daily engagement)           |

**Dice Damage Type**: Determined by the character's **equipped weapon**:

- Physical weapons → Physical dice (use Strength attribute)
- Magic weapons → Magic dice (use Magic attribute)

#### Dice Bank Limits

- **Storage**: Dice are stored in `character.data.diceBank` (integer)
- **Maximum Capacity**: Based on character tier to prevent hoarding
  - Tier 1: 10 dice max
  - Tier 2: 15 dice max
  - Tier 3: 20 dice max
- **Daily Allowance**: Each day, users receive bonus dice based on tier (added to bank, up to max)

#### Dice Spending Limits

- **Maximum dice per turn**: Capped based on tier to prevent "100 dice" scenarios
  - Tier 1: 5 dice max per attack
  - Tier 2: 6 dice max per attack
  - Tier 3: 7 dice max per attack

### Combat Flow

#### Turn Structure (Reactive)

1. **User Action**:
   - User navigates to the **Adventure/Missions** tab.
   - User selects an active mission and spends dice from bank (up to per-turn maximum). User rolls the dice manually and sees an animation of the dice rolling.
   - System calculates which dice are counted as hits based on the character's attributes.

2. **Reactive Resolution**:
   - System rolls Enemy defense dice.
   - System rolls Enemy counter-attack dice.
   - User rolls defense dice (from armor).
   - All results are calculated and applied instantly:
     - Final Damage to Enemy = (Hits - Blocks).
     - Final Damage to Player = (Enemy Hits - Player Blocks).

3. **Result**:
   - If Enemy HP <= 0, mission phase advances or rewards are given.
   - If Player HP <= 0, player is "Downed".
   - Mana and status effects update.

#### Combat Example (Reactive Resolution)

```
You have 8 Physical Dice in your bank. You play as Templar class. Your weapon is physical.
Enemy: Skeleton (3 health, 1 Physical Defense Dice)

User spends 4 dice to attack.
Your Strength (Attack): 4+ threshold

REACTIVE RESOLUTION:
1. Player Rolls: [5, 2, 6, 4] → 2 hits (6 is critical)
2. Enemy Defense (4+): [6] → 1 block (can block critical)
3. Enemy Counter (4+): [5, 4, 2] → 2 hits
4. Player Defense (4+): [6, 3] → 1 block

RESULTS:
- Damage to Enemy: 3 (hits) - 1 (block) = 2 wounds
- Damage to Player: 2 (hits) - 1 (block) = 1 wound
- Player Mana regenerated: +1

Status:
- Enemy: 1/3 HP remaining
- Player: 7/8 HP remaining
```

### Habit Consistency Bonus

To gamify consistency, users who complete habits daily receive bonus dice:

- **Streak Multiplier**: For each consecutive day a habit is completed:
  - Days 1-6: Base dice (2 dice)
  - Days 7-13: +1 bonus dice (3 dice total)
  - Days 14-20: +2 bonus dice (4 dice total)
  - Days 21+: +3 bonus dice (5 dice total)
- **Streak Break**: Missing a day resets the streak to 0 for that habit
- **Multiple Habits**: Each habit tracks its own streak independently

### Attributes & Stats

Attributes determine **Success Thresholds** for dice rolls (matching board game mechanics):

- **Strength (Attack)**: Threshold for physical attack dice (lower is better).
- **Strength (Defense)**: Threshold for blocking physical attacks
- **Magic (Attack)**: Threshold for magic attack dice
- **Magic (Defense)**: Threshold for blocking magic attacks

**Secondary Effects**:

- **Critical Hits**: Rolling a 6 always hits and can only be blocked by another 6

### Doctrines & Mana System

Doctrines should be stored in an object in code.

- **Mana Cost**: Doctrines consume mana as specified in each class's doctrine list (see `arq-lore/Mecanicas/Clases.md`)
- **Spam Prevention**: Mana cost alone prevents doctrine spamming (no cooldowns)
- **Mana Regeneration**: After each complete turn (player + enemy), mana regenerates:
  - Base regeneration: 1 mana/turn
  - Modified by tier and equipment
- **Strategic Use**: Since doctrines cost 2-10 mana and regeneration is slow, players must choose when to use powerful abilities

### Failure States

- **Out of Dice**: If dice bank reaches 0, user must complete tasks to earn more dice before continuing combat.
- **Player Defeated**: If HP reaches 0:
  - Character is "downed" for 24 hours.
  - **Cannot start or continue missions** while downed.
  - **Can still earn dice** by completing tasks/habits during this time.
  - Re-enable adventure access after 24 hours.

### Co-op Preparation (Future Feature)

The system is designed to support party-based gameplay:

- **Party System**: Characters can join parties for missions (2-4 players recommended)
- **Turn Order**: Round-robin (Player 1 → Enemy → Player 2 → Enemy → ...)
- **Individual Resources**: Each player has their own dice bank and mana (no sharing/trading)
- **Revive Mechanic**: Downed allies can only be revived using specific doctrines or rare items (not a default action)
- **Shared Victory**: All party members receive rewards when mission is completed
- **Loot Distribution**: Each player rolls separately from the same drop table

## Database Schema Changes

The current schema must be updated to reflect the Lore attributes and support the new Mechanics.

### Attribute Alignment

Current Schema uses `Strength, Wisdom, Resistance, Faith`.
**Lore Definition**: `Strength, Magic` (Defense/Attack split is derived).

**Proposed Update**:
Simplify `CharacterClass` attributes to match the new simplified App mechanics:

- `strength_atk` (int): Physical Attack modifier. Replaces strength and resistance.
- `strength_def` (int): Physical Defense modifier. Replaces strength and resistance.
- `magic_atk` (int): Magical Attack modifier. Replaces wisdom and faith.
- `magic_def` (int): Magical Defense modifier. Replaces wisdom and faith.
- `health` and `mana` should be initialized to the class base values. Health default will be 5 and mana will be 5.

In `Character`, we will add:

- `inventory`: a json array of `InventoryItem` (items in backpack/storage).
- `loadout`: a json array of `InventoryItem` (equipped items).
- `gold`: the amount of gold the user has.
- `data`: a JSONB field containing:
  - `diceBank`: integer, current dice available for combat
  - `lastDiceReset`: timestamp of last weekly reset
  - `habitStreaks`: object mapping habit IDs to consecutive completion days
  - `morality`: integer, character alignment (0-100)

### Type Definitions

Instead of database models, we will use JSON fields and Code Constants.

#### Equipment & Inventory (JSON in Character)

Stored in the `character.inventory` JSONB column. Available equipment will be defined in code.

```typescript
export const ItemType = {
  WEAPON_MELEE: 'WEAPON_MELEE',
  WEAPON_RANGED: 'WEAPON_RANGED',
  WEAPON_MAGIC: 'WEAPON_MAGIC',
  ARMOR: 'ARMOR',
  ACCESSORY: 'ACCESSORY'
} as const
export type ItemType = (typeof ItemType)[keyof typeof ItemType]

export const ItemRarity = {
  COMMON: 'COMMON',
  RARE: 'RARE',
  LEGENDARY: 'LEGENDARY'
} as const
export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity]

interface InventoryItem {
  id: string // uuid
  name: string
  description?: string
  type: ItemType
  tier: number // 1-10
  rarity: ItemRarity
  stats: any // json with stats
  obtainedAt: Date
}
```

#### Bestiary (Code Constants)

Enemies are defined in code for constant lookup (`shared/constants/enemies.ts`). Attributes match `CharacterClass` for consistency.

```typescript
type EnemyType = 'MINION' | 'ELITE' | 'BOSS'
type DamageType = 'PHYSICAL' | 'MAGIC' | 'BOTH'

interface DropTable {
  materials: {
    materialId: string
    chance: number // 0-1
    quantity: [min: number, max: number]
  }[]
}

interface Enemy {
  id: string
  name: string
  tier: number
  type: EnemyType

  // Stats (matching CharacterClass)
  health: number
  mana: number
  damageType: DamageType
  strengthAtk: number // Physical attack threshold
  strengthDef: number // Physical defense threshold
  magicAtk: number // Magic attack threshold
  magicDef: number // Magic defense threshold
  manaRegen: number

  // Rewards
  xpReward: number
  goldReward: number
  dropTable?: DropTable
}
```

#### Party

We will prepare the database schema for future party and multiplayer features. One party has many characters. A Party is auto-created with a random name when a Character is created.

```prisma
model Party {
  id                String      @id @default(uuid()) @db.Uuid
  name              String?     @db.VarChar(255)
  currentMissionId  String?     @db.Uuid
  createdAt         DateTime    @default(now()) @db.Timestamp(6)
  updatedAt         DateTime    @updatedAt @db.Timestamp(6)
  characters        Character[]
  missions          Mission[]
}
```

We will need to add `partyId` to `Character` model.

#### Mission (Combat State)

State of the current "Mission". The `name` field references the mission constant.

```prisma
model Mission {
  id            String    @id @default(uuid()) @db.Uuid
  partyId       String    @db.Uuid
  name          String    @db.VarChar(255)  // Reference to mission constant
  description   String?
  requiredTier  Int       @default(1)
  status        String    @db.VarChar(20)   // ACTIVE, COMPLETED, FAILED
  currentPhase  Int       @default(0)
  enemyState    Json?     // Current enemy HP states
  rewards       Json?     // {xp, gold, items}
  createdAt     DateTime  @default(now()) @db.Timestamp(6)
  updatedAt     DateTime  @updatedAt @db.Timestamp(6)
  completedAt   DateTime? @db.Timestamp(6)
  party         Party     @relation(fields: [partyId], references: [id], onDelete: Cascade)

  @@map("missions")
}
```

## Equipment System Implementation

Based on `Mecanicas/Equipamiento.md`.

- **Tiers**: Implementing Tiers 1-3 initially.
- **Slots**:
  - Main Weapon
  - Armor
  - Accessory (Ring/Amulet)

## Frontend Changes

This section outlines the frontend modifications required to support the gamification features.

### New Views

| View               | Route                     | Description                                                                                                                                                                                                                                             |
| :----------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Adventure**      | `/adventure`              | Main combat hub. Displays active mission, dice bank, and combat controls. Houses the dice rolling UI and combat resolution animations.                                                                                                                  |
| **Missions**       | `/adventure/missions`     | Mission selection screen. Lists available missions by tier, shows tier-gating, and mission requirements.                                                                                                                                                |
| **Mission Detail** | `/adventure/missions/:id` | Detailed view of a specific mission. If the mission hasn't started yet, it shows the details. If it has started, it displays the mission details (reduced or collapsible) on one side and the combat on the other, occupying most or all of the screen. |
| **Bestiary**       | `/adventure/bestiary`     | Encyclopedia of discovered enemies with stats and lore (optional, lower priority).                                                                                                                                                                      |

### Component Modifications

#### `AppSidebar.tsx`

- Add new sidebar item: **Adventure** with an appropriate icon (e.g., `Sword` or `Map`).

#### `Inventory.tsx` (View)

- **Update attribute cards**: Replace current attributes (`strength`, `wisdom`, `resistance`, `faith`) with new system (`strength_atk`, `strength_def`, `magic_atk`, `magic_def`).
- **Add new stat cards**: `Gold`, `Dice Bank` (current/max), `Health` (current/max), `Mana` (current/max).
- **Add equipment section**: Display equipped items (Weapon, Armor, Accessory slots) with item cards.
- **Add inventory grid**: Scrollable grid showing all `inventory` items with tooltips showing item stats.
- **Add loadout management**: Ability to equip/unequip items from inventory to loadout.

#### `Dashboard.tsx` (View)

- **Add dice bank widget**: Small card showing current dice available and max capacity.
- **Add character status widget**: Show current HP, Mana, downed status, and time until recovery. Should include a direct link to the character status/inventory view.
- **Add active mission widget**: If in a mission, show mission name and progress. Should include a direct link to the mission URL (`/adventure/missions/:id`).

### New Components

#### Combat System Components

| Component         | Description                                                                                                                    |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `DiceBankDisplay` | Shows current dice count, max capacity, and visual representation of dice. Used in Dashboard and Adventure views.              |
| `DiceRoller`      | Interactive dice rolling interface with animation. User selects number of dice to spend, triggers roll, sees animated results. |
| `DiceResult`      | Displays individual die result with hit/miss visual feedback based on threshold.                                               |
| `CombatArena`     | Main combat container showing player character, enemy, and combat state.                                                       |
| `EnemyCard`       | Displays enemy sprite, name, health bar, type badge (Minion/Elite/Boss).                                                       |
| `CombatLog`       | Scrollable log of combat events with color-coded entries (damage dealt, damage received, blocks, criticals).                   |
| `TurnResolver`    | Animated display of turn resolution: player attack → enemy defense → enemy counter → player defense → results.                 |
| `HealthBar`       | Reusable health bar component with current/max HP display.                                                                     |
| `ManaBar`         | Reusable mana bar component with current/max mana display.                                                                     |

#### Mission Components

| Component               | Description                                                                                 |
| :---------------------- | :------------------------------------------------------------------------------------------ |
| `MissionCard`           | Card displaying mission name, tier, difficulty, rewards preview. Clickable to view details. |
| `MissionList`           | Filtered/sorted list of available missions with tier tabs.                                  |
| `MissionPhaseIndicator` | Shows current phase in a multi-phase mission with progress dots.                            |
| `RewardDisplay`         | Shows potential/earned rewards: XP, Gold, Items.                                            |
| `TierGate`              | Visual indicator when content is locked due to tier requirements.                           |

#### Inventory/Equipment Components

| Component       | Description                                                                               |
| :-------------- | :---------------------------------------------------------------------------------------- |
| `ItemCard`      | Displays item with name, icon, rarity border color, and type badge.                       |
| `ItemTooltip`   | Hover tooltip showing full item stats and description.                                    |
| `EquipmentSlot` | Single equipment slot (Weapon/Armor/Accessory) that can hold an item or show empty state. |
| `LoadoutPanel`  | Panel containing all equipment slots for the character's loadout.                         |
| `InventoryGrid` | Grid layout of owned items with filtering by type.                                        |

#### Character Status Components

| Component            | Description                                                                                    |
| :------------------- | :--------------------------------------------------------------------------------------------- |
| `CharacterStatusBar` | Compact bar showing HP, Mana, Dice count for use in headers/sidebars.                          |
| `DownedOverlay`      | Full-screen or modal overlay shown when character is downed, with countdown timer to recovery. |
| `HabitStreakBadge`   | Small badge showing streak count on habit cards in Habits view.                                |

### New Dialogs

| Dialog                    | Description                                                                                              |
| :------------------------ | :------------------------------------------------------------------------------------------------------- |
| `StartMissionDialog`      | Confirmation dialog before starting a mission. Shows requirements, party info, and estimated difficulty. |
| `MissionCompleteDialog`   | Victory screen displaying earned rewards, XP gained, items dropped.                                      |
| `MissionFailedDialog`     | Defeat screen. Shows what happened and recovery time if downed.                                          |
| `EquipItemDialog`         | Confirmation when equipping an item, showing stat comparison.                                            |
| `DoctrineSelectionDialog` | During combat, select which doctrine to use. Shows mana cost and effect.                                 |
| `CharacterDownedDialog`   | Alert when character is downed. Explains 24-hour recovery period.                                        |

### State Management

We will leverage **TanStack Query** (via TRPC) to manage character, combat, and mission states.

- **Character State**: Fetched via `trpc.character.get.useQuery()`.
- **Combat Resolution**: Handled via `trpc.combat.resolveTurn.useMutation()`, which will invalidate the character and mission queries to trigger UI updates.
- **Mission Progress**: Managed via `trpc.mission.getActive.useQuery()`.
- **Local UI State**: Simple components will use local `useState` for UI-only transitions (e.g., dice roll animations before mutation is called).

### Type Definitions

Add new types in `types/` directory:

```typescript
// types/gamification.types.ts

// Item types (should be in the shared directory)
export const ItemType = {
  WEAPON_MELEE: 'WEAPON_MELEE',
  WEAPON_RANGED: 'WEAPON_RANGED',
  WEAPON_MAGIC: 'WEAPON_MAGIC',
  ARMOR: 'ARMOR',
  ACCESSORY: 'ACCESSORY'
} as const
export type ItemType = (typeof ItemType)[keyof typeof ItemType]

export const ItemRarity = {
  COMMON: 'COMMON',
  RARE: 'RARE',
  LEGENDARY: 'LEGENDARY'
} as const
export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity]

interface InventoryItem {
  id: string
  name: string
  description?: string
  type: ItemType
  tier: number
  rarity: ItemRarity
  stats: Record<string, number>
  obtainedAt: Date
}

// Enemy types (for display)
type EnemyType = 'MINION' | 'ELITE' | 'BOSS'

interface Enemy {
  id: string
  name: string
  tier: number
  type: EnemyType
  health: number
  currentHealth: number
  damage: number
}

// Combat types
interface DiceRollResult {
  value: number
  isSuccess: boolean
  isCritical: boolean
}

interface CombatTurnResult {
  playerRolls: DiceRollResult[]
  enemyDefenseRolls: DiceRollResult[]
  enemyAttackRolls: DiceRollResult[]
  playerDefenseRolls: DiceRollResult[]
  damageToEnemy: number
  damageToPlayer: number
  manaRegenerated: number
}

// Mission types
type MissionStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

interface MissionPhase {
  enemies: Enemy[]
  completed: boolean
}

interface Mission {
  id: string
  name: string
  description: string
  requiredTier: number
  phases: MissionPhase[]
  currentPhase: number
  rewards: {
    xp: number
    gold: number
    items?: InventoryItem[]
  }
}
```

### Translation Keys

Add new i18n keys for:

- Adventure tab labels and combat UI
- Mission names and descriptions
- Item names, descriptions, and types
- Combat log messages
- Status effect names
- Error states (out of dice, character downed, tier-gated)

### UI Assets Required

- Dice sprites (d6 faces, rolling animation)
- Enemy sprites (from Lore assets or generated)
- Item icons by type and rarity
- Combat effect animations (hit, miss, critical, block)
- Health/Mana bar designs
- Mission/dungeon background art

## Implementation Notes

- **Manual Interaction**: Combat is not automated. Users must manually spend dice in the "Adventure" tab.
- **No Migration**: Since the project is in early development, no database migration for existing user data is required. Global state can be reset.

## Morality System

The Morality System tracks the character's ethical alignment based on narrative choices and actions. This system influences how the world reacts to the player and unlocks unique gameplay paths.

### Morality Attribute

- **Range**: 0 to 100.
- **Starting Point**: 50 (Neutral).

### Alignment Thresholds

- **Saint (75 - 100)**: Characters who consistently choose the path of righteousness.
  - **Effects**: Unlocks "Holy" quest branches, reputation bonuses with law-abiding factions, and access to exclusive divine equipment.
  - **Visuals**: Radiant UI elements and saintly titles.
- **Neutral (26 - 74)**: Most characters will reside here, maintaining a balance.
  - **Effects**: Standard interactions and balanced access to most world content.
- **Demon (0 - 25)**: Characters who embrace chaos or selfishness.
  - **Effects**: Unlocks "Shadow" quest branches, access to black markets, and intimidation-based narrative shortcuts.
  - **Visuals**: Fiery or dark UI accents and demonic titles.

### Impact of Narrative Decisions

Morality is primarily shaped by the player's choices:

- **Dialogue Choices**: Decisions made during mission dialogues can shift morality points in either direction.
- **Mission Outcomes**: Choosing how to resolve a conflict (e.g., mercy vs. vengeance) has significant morality weight.
- **World Events**: Random narrative events triggered by productivity milestones can present moral dilemmas.

## Achievement-Based Title System

This system defines the hierarchy and legal standing within the Order, earned through cumulative achievements and progression.

| Rank | Title                               | Role & Responsibility                                                                                               | Forms of Address              |
| :--- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :---------------------------- |
| 1    | **Grand Master**                    | Supreme authority. Directs strategy, policy, and administration. Accountable only to the Pope or the founding King. | _"My Lord Grand Master"_      |
| 2    | **Provincial Master / Grand Prior** | Regional governor. Executes orders from the Grand Master; coordinates castles and local campaigns.                  | _"My Lord"_                   |
| 3    | **Commander**                       | Commander of a fortress or territory. Manages resources, internal justice, and local troops.                        | _"My Lord"_                   |
| 4    | **Knights of the Order**            | Military elite. Nobles bound by vows of obedience and poverty. Lead smaller combat units.                           | _"Brother Knight"_ or _"Sir"_ |
| 5    | **Sergeants-at-Arms**               | Non-noble professional warriors. Heavy infantry, scouts, or light cavalry.                                          | _"Brother"_                   |
| 6    | **Chaplains**                       | Clerical branch. Spiritual guidance, sacraments, and doctrinal integrity. No military command.                      | _"Brother"_                   |
| 7    | **Serving Brothers / Squires**      | Logistical support. Maintain equipment, stables, and fortifications.                                                | _"Brother"_                   |

### Internal Protocol

Members of the Order typically address one another as **"Brother"** regardless of rank, emphasizing their shared commitment. Formal titles are used in official commands or when representing the Order to outsiders.

### Post-Implementation Roadmap

- [ ] Technical copy for the landing page.
- [ ] Map out narrative decision branches.
- [ ] Expand equipment variety and mission diversity.
- [ ] Review game development community feedback.
- [ ] Evaluate randomized mission delivery (deck-based mechanics).
