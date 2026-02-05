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
- Tier Promotion
  - Tracking: The system tracks enemy defeats via the `CombatEnemy` model, not on `CharacterClass`.
  - Tier 2 Requirement: Defeat 10 total enemies (beta).
  - Tier 3 Requirement: Defeat 30 total enemies (beta).
  - Note: Requirements are accelerated for closed beta testing. Production values will be higher.

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

### Initiative System

The **Initiative System** uses weapon and enemy `speed` to determine attack order:

- **Speed Comparison**: At turn start, compare player weapon speed vs enemy speed
- **Higher Speed Attacks First**: The combatant with higher speed resolves their attack first
- **Tie-Breaker**: On equal speed, the player attacks first
- **Skipped Counter-Attack**: If the player wins initiative AND kills the enemy, no counter-attack occurs

| Weapon Type                    | Speed | Initiative Advantage |
| ------------------------------ | ----- | -------------------- |
| Light weapons (sword, pistol)  | 2     | ✅ Attack first      |
| Heavy weapons (hammer, musket) | 1     | ❌ Attack second     |

> **Design Rationale**: This compensates for light weapons having fewer attack dice by allowing them to potentially kill enemies before taking damage.

### Expanded Criticals (Fast Weapons)

Fast weapons have an expanded critical range:

| Weapon Speed   | Critical Range | Effect                         |
| -------------- | -------------- | ------------------------------ |
| Speed 2 (fast) | 5 and 6        | Both values count as criticals |
| Speed 1 (slow) | 6 only         | Standard critical behavior     |

**Critical Effects**:

- Criticals always hit regardless of the success threshold
- Criticals can only be blocked by other criticals (6s)

> **Design Rationale**: This gives light weapons ~33% critical chance vs ~17% for heavy weapons, partially compensating for fewer dice.

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

### Map Activities System

Community Activities are **shared objectives** where all players of a faction contribute to global goals. This replaces the party-based mission system.

#### Core Concept

- **Map-based**: Activities appear as points on the world map using **SVG with React components**
- **Faction-bound**: Each activity belongs to a faction; players can only participate in their own faction's activities
- **Individual Combat**: Players fight 1v1 against enemies, but victories contribute to a shared progress bar
- **Real-time Deadlines**: Activities expire after a set time (days/weeks); deadlines use **server timezone**
- **World Impact**: Success/failure changes the map state and unlocks/blocks future activities
- **Activity Scheduling**: Activities are **manually created through API calls** (no automatic scheduling)
- **Progress Sync**: Global progress updates via **polling** (every X seconds)

#### Activity Structure

| Field                | Description                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `id`                 | Unique identifier                                                                          |
| `name`               | Activity title                                                                             |
| `mapId`              | ID of the map image to display (e.g., `santa_cruz_siege`)                                  |
| `position`           | Position as `{ x: number, y: number }` — percentages (0-100) from top-left                 |
| `factionId`          | Owning faction                                                                             |
| `objective`          | Collective goal (e.g., "Defeat 1000 demons")                                               |
| `progress`           | Current global count                                                                       |
| `target`             | Goal to reach (dynamically scaled)                                                         |
| `deadline`           | Timestamp when activity expires                                                            |
| `difficulty`         | `EASY`, `NORMAL`, or `HARD` — affects objective scaling                                    |
| `communityBonus`     | Extra reward if objective is completed                                                     |
| `enemySpawnWeights`  | Weighted probability table for enemy spawns (e.g., `{ magma_demon: 80, elite_demon: 20 }`) |
| `successConsequence` | What happens on success (unlocks, map changes)                                             |
| `failureConsequence` | What happens on failure (new emergencies, blocked areas)                                   |

##### React Implementation for Map Markers

Activity markers use CSS `position: absolute` with percentage-based `left` and `top`:

```tsx
// components/WorldMap.tsx
interface MapMarkerProps {
  activity: ActivityTemplate
  onClick: () => void
}

function MapMarker({ activity, onClick }: MapMarkerProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${activity.position.x}%`,
        top: `${activity.position.y}%`,
        transform: 'translate(-50%, -50%)' // Center the marker on the point
      }}
    >
      {/* marker icon */}
    </button>
  )
}

function WorldMap({ mapId, activities }: WorldMapProps) {
  const mapSrc = `/assets/maps/${mapId}.png`

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Image src={mapSrc} alt="Map" style={{ width: '100%', height: 'auto' }} />
      {activities.map(activity => (
        <MapMarker key={activity.id} activity={activity} onClick={() => ...} />
      ))}
    </div>
  )
}
```

> **Why percentages?** Using percentages (0-100) instead of pixels ensures markers stay in the correct position regardless of screen size or container dimensions.

#### Dynamic Objective Scaling

Objectives scale based on active player count:

**Formula**: `Target = BaseTarget + (ActivePlayers × DifficultyFactor)`

| Difficulty | Factor | Example (10 players) | Example (100 players) |
| ---------- | ------ | -------------------- | --------------------- |
| Easy       | ×10    | 150 enemies          | 1,050 enemies         |
| Normal     | ×15    | 200 enemies          | 1,550 enemies         |
| Hard       | ×25    | 300 enemies          | 2,550 enemies         |

- **Base minimum**: 50 enemies (ensures content for small communities)
- **Active Player**: User who completed at least 1 combat in the last 7 days
- Target is fixed at activity start (no mid-event changes unless emergency rebalancing)

#### Player Flow

1. **View Map** — Player opens the world map in sidebar
2. **Select Activity** — Hover shows description, click opens details
3. **Read Details** — Objective, current progress, time remaining, join activity button
4. **Combat** — Fight 1v1 against activity enemies. The UI should should 3 enemies, in case the player has an area damage doctrine.
5. **Contribute** — Each victory increments global progress
6. **Earn Rewards** — Gold per enemy + community bonus if successful

#### Map State Updates

When an activity's deadline passes:

1. Evaluate if `progress >= target`
2. Distribute community bonuses to all participants (if successful)
3. Apply success/failure consequences to map state
4. Unlock or spawn new activities based on outcome

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

  // Combat dice (replaces ENEMY_DICE_BY_TYPE lookup)
  attackDice: number
  defenseDice: number

  // Rewards - randomized within range on defeat
  goldReward: { min: number; max: number }
  dropTable?: DropTable
}
```

#### Map Activity (Code Constants + Database State)

Activities are defined as code constants for structure, with database tracking for global progress.

##### Activity Template (Code)

```typescript
// shared/constants/activities.ts
export enum ActivityDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

interface ActivityTemplate {
  id: string
  name: string
  mapId: string // References map image (e.g., 'santa_cruz_siege')
  position: { x: number; y: number } // Percentage (0-100) from top-left
  factionId: string
  description: string
  objective: string
  baseTarget: number // Base enemy count before scaling
  difficulty: ActivityDifficulty
  durationDays: number
  communityBonus: number
  enemySpawnWeights: Record<string, number> // Enemy ID -> spawn weight
  successConsequence: string // Description of what happens on success
  failureConsequence: string // Description of what happens on failure
  successText: string // Message shown to players on success
  failureText: string // Message shown to players on failure
}
```

##### Activity State (Database)

```prisma
model MapActivity {
  id              String    @id @default(uuid()) @db.Uuid
  activityId      String    @db.VarChar(255)  // Reference to ActivityTemplate.id
  status          String    @db.VarChar(20)   // ACTIVE, COMPLETED, FAILED, LOCKED
  progress        Int       @default(0)       // Current kill count
  target          Int                         // Calculated at start (scaled)
  startedAt       DateTime  @default(now()) @db.Timestamp(6)
  deadline        DateTime  @db.Timestamp(6)
  completedAt     DateTime? @db.Timestamp(6)

  participations  ActivityParticipation[]

  @@map("map_activities")
}

model ActivityParticipation {
  id            String      @id @default(uuid()) @db.Uuid
  activityId    String      @db.Uuid
  characterId   String      @db.Uuid
  kills         Int         @default(0)         // Individual contribution
  goldEarned    Int         @default(0)
  joinedAt      DateTime    @default(now()) @db.Timestamp(6)
  lastCombatAt  DateTime?   @db.Timestamp(6)
  combatStats   Json?       // Aggregated stats across all enemies

  activity      MapActivity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  character     Character   @relation(fields: [characterId], references: [id], onDelete: Cascade)
  enemies       CombatEnemy[]

  @@unique([activityId, characterId])
  @@map("activity_participations")
}

model CombatEnemy {
  id              String    @id @default(uuid()) @db.Uuid
  participationId String    @db.Uuid
  templateId      String    @db.VarChar(255)  // Reference to enemy template
  namePrefix      String    @db.VarChar(100)  // Translation key for procedural name prefix
  nameSuffix      String    @db.VarChar(100)  // Translation key for procedural name suffix
  maxHealth       Int
  currentHealth   Int
  status          String    @default("ACTIVE") @db.VarChar(20)  // ACTIVE, DEFEATED
  spawnedAt       DateTime  @default(now()) @db.Timestamp(6)
  defeatedAt      DateTime? @db.Timestamp(6)
  turnsElapsed    Int       @default(0)
  damageDealt     Int       @default(0)  // Damage dealt TO this enemy
  damageTaken     Int       @default(0)  // Damage taken FROM this enemy
  criticalHits    Int       @default(0)
  combatLog       Json      @default("[]")  // Per-enemy combat log (capped at 50 entries)

  participation   ActivityParticipation @relation(fields: [participationId], references: [id], onDelete: Cascade)

  @@index([participationId, status])
  @@map("combat_enemies")
}
```

#### Procedural Enemy Naming

Enemies now have procedural names generated using translation keys. This makes repeated enemy encounters feel unique:

- **Name Structure**: `[Prefix] [Enemy Type Name] [Suffix]`
  - Example: "Vorath the Hollow Skeleton" or "Velefor Dreadlord Demon"
- **Translation Keys**:
  - Prefixes: `enemyNames.{type}.prefix.{index}` (e.g., `enemyNames.minion.prefix.0`)
  - Suffixes: `enemyNames.{type}.suffix.{index}` (e.g., `enemyNames.elite.suffix.2`)
- **Enemy Types**: Different name pools for MINION, ELITE, and BOSS enemies
- **Storage**: `namePrefix` and `nameSuffix` fields on `CombatEnemy` store the translation keys

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

| View                | Route               | Description                                                                                                          |
| :------------------ | :------------------ | :------------------------------------------------------------------------------------------------------------------- |
| **World Map**       | `/map`              | Interactive map showing activity points. Sidebar component also displays a mini-map. Main hub for community content. |
| **Activity Detail** | `/map/activity/:id` | Activity details: objective, progress bar, deadline, enemy list. Contains the combat interface when joined.          |

#### Future Views

| View            | Route                     | Description                                                     |
| :-------------- | :------------------------ | :-------------------------------------------------------------- |
| **Leaderboard** | `/map/activity/:id/ranks` | Top contributors for the current activity (kills, gold earned). |
| **Bestiary**    | `/adventure/bestiary`     | Encyclopedia of discovered enemies with stats and lore.         |

### Component Modifications

#### `AppSidebar.tsx`

Restructure the sidebar into two sections:

**Productivity Section:**
| Item | Route | Icon |
|------|-------|------|
| Dashboard | `/` | `LayoutDashboard` |
| Objectives & Areas | `/objectives` | `Target` |
| Tasks | `/tasks` | `CheckSquare` |
| Habits | `/habits` | `Repeat` |

**RPG Section:**
| Item | Route | Icon |
|------|-------|------|
| Inventory | `/inventory` | `Backpack` |
| Shop | `/shop` | `Store` |
| Map Activities | `/map` | `Map` |
| Activities Log | `/activities-log` | `Scroll` |

**Configuration Section:**
| Item | Route | Icon |
|------|-------|------|
| Settings | `/settings` | `Settings` |

> **Note:** The previous Adventure view (`/adventure`) is removed. Combat is now accessed through Map Activities.

#### `Inventory.tsx` (View)

- **Update attribute cards**: Replace current attributes (`strength`, `wisdom`, `resistance`, `faith`) with new system (`strength_atk`, `strength_def`, `magic_atk`, `magic_def`).
- **Add new stat cards**: `Gold`, `Dice Bank` (current/max), `Health` (current/max), `Mana` (current/max).
- **Add equipment section**: Display equipped items (Weapon, Armor, Accessory slots) with item cards.
- **Add inventory grid**: Scrollable grid showing all `inventory` items with tooltips showing item stats.
- **Add loadout management**: Ability to equip/unequip items from inventory to loadout.

#### `Dashboard.tsx` (View)

- **Add dice bank widget**: Small card showing current dice available and max capacity.
- **Add character status widget**: Show current HP, Mana, downed status, and time until recovery. Should include a direct link to the character status/inventory view.
- **Add active activity widget**: If participating in an activity, show activity name and global progress. Should include a direct link to the activity URL (`/map/activity/:id`).

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

#### Map & Activity Components

| Component               | Description                                                                             |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `WorldMap`              | Interactive SVG map with clickable activity markers. Shows zone status (secure/fallen). |
| `ActivityMarker`        | Map pin showing activity location, status, and hover preview.                           |
| `ActivityCard`          | Card showing activity name, progress, deadline countdown, rewards. Clickable to join.   |
| `ProgressBar`           | Community progress bar with current/target counts and percentage.                       |
| `DeadlineCountdown`     | Real-time countdown timer showing days/hours/minutes remaining.                         |
| `ContributorsList`      | Scrollable list of top contributors with their kill counts.                             |
| `RewardDisplay`         | Shows gold per kill + community bonus preview.                                          |
| `ActivityLockedOverlay` | Overlay for activities that require completing another activity first.                  |

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

| Dialog                    | Description                                                                            |
| :------------------------ | :------------------------------------------------------------------------------------- |
| `JoinActivityDialog`      | Confirmation before joining an activity. Shows enemies, rewards, and current progress. |
| `ActivityCompleteDialog`  | Community victory screen. Shows total progress, personal contribution, bonus earned.   |
| `ActivityFailedDialog`    | Community failure screen. Shows consequence and what happens next on the map.          |
| `EquipItemDialog`         | Confirmation when equipping an item, showing stat comparison.                          |
| `DoctrineSelectionDialog` | During combat, select which doctrine to use. Shows mana cost and effect.               |
| `CharacterDownedDialog`   | Alert when character is downed. Explains 24-hour recovery period.                      |

### State Management

We will leverage **TanStack Query** (via TRPC) to manage character, combat, and mission states.

- **Character State**: Fetched via `trpc.character.get.useQuery()`.
- **Combat Resolution**: Handled via `trpc.combat.resolveTurn.useMutation()`, which will invalidate the character and mission queries to trigger UI updates.
- **Activity Progress**: Managed via `trpc.activity.getActive.useQuery()`.
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
- **Demon (0 - 25)**: Characters who embrace the void or selfishness.
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
- [ ] Expand equipment variety and activity diversity.
- [ ] Review game development community feedback.
- [ ] Implement special rewards (titles, unique items) for top contributors.

---

## Investment System

The Investment System allows players to collectively fund world-altering projects using gold. This creates a gold sink and encourages community cooperation toward shared goals.

### Core Concept

- **Faction-bound**: Each investment belongs to a faction; players can only contribute to their own faction's investments
- **Free contribution**: Players can contribute any amount of gold (minimum 1)
- **No refunds**: Contributions are permanent regardless of outcome
- **Real-time progress**: Players see current funding progress toward the goal
- **Strict deadlines**: Investments expire after a set time (configurable per investment)
- **World impact**: Success/failure changes the game world state

### Investment Structure

| Field           | Description                        |
| --------------- | ---------------------------------- |
| `id`            | Unique database identifier         |
| `investmentId`  | Reference to InvestmentTemplate.id |
| `factionName`   | Owning faction                     |
| `status`        | ACTIVE, COMPLETED, or FAILED       |
| `currentAmount` | Current gold contributed           |
| `targetAmount`  | Goal to reach (dynamically scaled) |
| `deadline`      | Timestamp when investment expires  |
| `contributions` | Array of individual contributions  |

### Dynamic Goal Scaling

Target amounts scale based on active player count:

**Formula**: `Target = BaseTarget + (ActivePlayers × ScaleFactor)`

| Investment              | Base  | Factor | Example (60 players) |
| ----------------------- | ----- | ------ | -------------------- |
| Anti-Demon Barrier      | 1,000 | ×80    | 5,800 gold           |
| Providence Purification | 2,000 | ×100   | 8,000 gold           |
| Dark Heart Operation    | 2,500 | ×125   | 10,000 gold          |
| Gen 2 Armament Program  | 1,500 | ×90    | 6,900 gold           |

### Database Schema

```prisma
model Investment {
  id            String                   @id @default(uuid()) @db.Uuid
  investmentId  String                   @db.VarChar(255)
  factionName   String                   @db.VarChar(100)
  status        String                   @db.VarChar(20)
  currentAmount Int                      @default(0)
  targetAmount  Int
  startedAt     DateTime                 @default(now())
  deadline      DateTime
  completedAt   DateTime?
  contributions InvestmentContribution[]

  @@map("investments")
}

model InvestmentContribution {
  id            String     @id @default(uuid()) @db.Uuid
  investmentId  String     @db.Uuid
  characterId   String     @db.Uuid
  amount        Int
  contributedAt DateTime   @default(now())
  investment    Investment @relation(...)
  character     Character  @relation(...)

  @@map("investment_contributions")
}
```

### Frontend Route

- **Investments Page**: `/investments` — Grid of active investments with contribution modal

---

## Implementation Notes

- **No Party System**: The Party model is no longer needed. Characters participate individually.
- **Combat Unchanged**: The dice-based reactive combat system remains the same; only the meta-structure around it changes.
- **Backward Compatibility**: Existing missions in code can be migrated to the ActivityTemplate format.
- **Cron Job Required**: A scheduled task to evaluate activity deadlines and apply consequences.
- **Map Assets Needed**: Zone illustrations, activity markers, status indicators.
  - Current map: `/assets/maps/santa_cruz.png` (source: `front/public/assets/maps/santa_cruz.png`)
- **CombatEnemy Model**: Per-enemy combat tracking with:
  - Procedural names via translation keys (`namePrefix`, `nameSuffix`)
  - Individual combat logs (capped at 50 entries per enemy)
  - Detailed statistics: `turnsElapsed`, `damageDealt`, `damageTaken`, `criticalHits`
  - Status tracking: `ACTIVE` or `DEFEATED`

### Files to Delete (Mission System Removal)

The following mission-related files should be deleted when implementing the new Map Activities system:

**Frontend:**

- `front/src/views/adventure/adventure-missions/` (entire directory)
- `front/src/views/adventure/mission-detail/` (entire directory)
- `front/src/views/adventure/components/mission-list.component.tsx`
- `front/src/views/adventure/components/active-mission-widget.component.tsx`
- `front/src/views/adventure/components/mission-card.component.tsx`

**Backend:**

- `server/services/mission.service.ts`
- `server/repositories/mission.repository.ts`
- `server/routers/missions.router.ts`

**Shared:**

- `shared/schemas/missions.schemas.ts`
- `shared/types/mission.types.ts`
- `shared/constants/missions.ts`

> **Note:** Build artifacts in `front/dist/` and `aws/cdk.out/` will be regenerated automatically.
