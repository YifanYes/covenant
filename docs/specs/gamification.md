# Gamification Technical Specification

## 1. Overview

This document outlines the technical specification for implementing the initial gamification layer in ARQ. The goal is to transform the user's productivity (completing tasks/habits/objectives) into in-game progress (combat, leveling, crafting, looting).

## 2. Progression Models

We are considering three models for character progression. **Proposal C (Gating)** is currently recommended for ensuring users engage with all app features, but the system should support the core loop common to all.

### Core Loop

1.  **Action**: User completes a Task or Habit.
2.  **Reward**: User gains Gold, XP, and Dice Rolls.
3.  **Conflict**: User spends Dice in the Adventure tab to reach the end of a Mission.
4.  **Loot**: If mission is successful, User gets specific Gold, XP and items.
5.  **Equip**: User uses Gold to buy or finds Equipment to improve stats. (Crafting moved to roadmap).

### Models

- **Proposal A: Efficiency Scaling (Classic RPG)**
  - Leveling up increases Gold/XP multipliers.
  - Better Gear = Higher multipliers.
- **Proposal B: Impact Doctrines (Overpower)**
  - Leveling unlocks Doctrine slots.
  - Better Gear = Stronger Doctrine effects (e.g., kill 2 enemies at once).
- **Proposal C: Gating & Preparation (Recommended)**
  - **Level Gating**: Must be Level X to enter Tier Y missions.
  - **Gear Gating**: Tier X enemies have "Shields" only penetrable by Tier X weapons.
  - **Loop**: Complete tasks/habits -> Get dice -> Enter Adventure -> Defeat enemies -> Level up/Get Gear.

## 3. Dice-Based Combat System

Combat uses the board game's dice mechanics, where completing tasks earns dice rolls that can be spent to attack enemies in the **Adventure** tab. Combat is **Reactive**: when the user attacks, the enemy defends and counter-attacks simultaneously.

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
  - Tier 1: 20 dice max
  - Tier 2: 30 dice max
  - Tier 3: 40 dice max
- **No Reset**: Dice do not reset weekly; they are kept until used.
- **Daily Allowance**: Each day, users receive bonus dice based on tier (added to bank, up to max)

#### Dice Spending Limits

- **Maximum dice per turn**: Capped based on tier to prevent "100 dice" scenarios
  - Tier 1: 6 dice max per attack
  - Tier 2: 8 dice max per attack
  - Tier 3: 10 dice max per attack

### Combat Flow

#### Turn Structure (Reactive)

1. **User Action**:
   - User navigates to the **Adventure/Missions** tab.
   - User selects an active mission and spends dice from bank (up to per-turn maximum).
   - System rolls attack dice using character's attribute threshold.

2. **Reactive Resolution**:
   - System rolls Enemy defense dice.
   - System rolls Enemy counter-attack dice.
   - System rolls Player defense dice (from armor).
   - All results are calculated and applied instantly:
     - Final Damage to Enemy = (Hits - Blocks).
     - Final Damage to Player = (Enemy Hits - Player Blocks).

3. **Result**:
   - If Enemy HP <= 0, mission phase advances or rewards are given.
   - If Player HP <= 0, player is "Downed".
   - Mana and status effects update.

#### Combat Example (Reactive Resolution)

```
You have 8 Physical Dice in your bank.
Enemy: Corrupted Soldier (6 HP, 2 Physical Defense Dice)

User spends 4 dice to attack. Your weapon is physical.
Your Strength (Attack): 3+ threshold

REACTIVE RESOLUTION:
1. Player Rolls: [5, 2, 6, 4] → 3 hits (6 is critical)
2. Enemy Defense (5+): [6, 3] → 1 block
3. Enemy Counter (4+): [5, 4, 2] → 2 hits
4. Player Defense (4+): [6, 3] → 1 block

RESULTS:
- Damage to Enemy: 3 (hits) - 1 (block) = 2 wounds
- Damage to Player: 2 (hits) - 1 (block) = 1 wound
- Mana regenerated: +2

Status:
- Enemy: 4/6 HP remaining
- Player: 11/12 HP remaining
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

- **Strength (Attack)**: Threshold for physical attack dice (lower is better)
  - Range: 2+ (master) to 6+ (untrained)
- **Strength (Defense)**: Threshold for blocking physical attacks
- **Magic (Attack)**: Threshold for magic attack dice
- **Magic (Defense)**: Threshold for blocking magic attacks
- **Speed**: Determines movement in missions (future feature)

**Secondary Effects**:

- **Critical Hits**: Rolling a 6 always hits and can only be blocked by another 6
- **Critical Drops**: Higher attack attributes increase rare material drop rates
- **Overdue Penalties**: Defense attributes reduce HP loss when tasks become overdue

### Doctrines & Mana System

- **Mana Cost**: Doctrines consume mana as specified in each class's doctrine list (see `arq-lore/Mecanicas/Clases.md`)
- **Spam Prevention**: Mana cost alone prevents doctrine spamming (no cooldowns)
- **Mana Regeneration**: After each complete turn (player + enemy), mana regenerates:
  - Base regeneration: 2 mana/turn
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

## 4. Database Schema Changes

The current schema must be updated to reflect the Lore attributes and support the new Mechanics.

### Attribute Alignment

Current Schema uses `Strength, Wisdom, Resistance, Faith`.
**Lore Definition**: `Strength, Magic` (Defense/Attack split is derived).

**Proposed Update**:
Simplify `CharacterClass` attributes to match the new simplified App mechanics:

- `strength`: Physical Attack/Defense modifier. Replaces strength and resistance.
- `magic`: Magical Attack/Defense modifier. Replaces wisdom and faith.
- `health` and `mana` should be initialized to the class base values.

In `Character`, we will add:

- `inventory`: a json array of `InventoryItem` (items in backpack/storage).
- `loadout`: a json array of `InventoryItem` (equipped items).
- `gold`: the amount of gold the user has.
- `data`: a JSONB field containing:
  - `diceBank`: integer, current dice available for combat
  - `lastDiceReset`: timestamp of last weekly reset
  - `habitStreaks`: object mapping habit IDs to consecutive completion days

### Type Definitions

Instead of database models, we will use JSON fields and Code Constants.

#### 1. Equipment & Inventory (JSON in Character)

Stored in the `character.inventory` JSONB column.

```typescript
type ItemType = 'WEAPON_MELEE' | 'WEAPON_RANGED' | 'WEAPON_MAGIC' | 'ARMOR' | 'ACCESSORY'
type ItemRarity = 'COMMON' | 'RARE' | 'LEGENDARY'

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

#### 2. Bestiary (Code Constants)

Enemies are defined in code for constant lookup (`src/constants/enemies.ts`).

```typescript
type EnemyType = 'MINION' | 'ELITE' | 'BOSS'

interface DropTable {
  materials: {
    materialId: string
    chance: number // 0-1
    quantity: [min: number, max: number]
  }[]
}

interface Enemy {
  id: string // specific ID (e.g., "rat_lvl1")
  name: string
  tier: number
  type: EnemyType

  // Stats
  health: number // "Hits" to kill
  damage: number // HP lost if user fails

  // Rewards
  xpReward: number
  goldReward: number
  dropTable?: DropTable
}
```

#### 4. ActiveEncounter (Combat State)

State of the current "Mission".

```prisma
model ActiveEncounter {
  id            String @id @default(uuid())
  characterId   String @unique
  currentEnemyId String // ID referencing the Enemy constant
  currentHp     Int    // Remaining HP of enemy

  character     Character @relation(...)
}
```

## 5. Equipment System Implementation

Based on `Mecanicas/Equipamiento.md`.

- **Tiers**: Implementing Tiers 1-3 initially.
  - _Tier 1 (Military)_: Basic stats.
  - _Tier 2 (Superior)_: Adds Passive Effects.
  - _Tier 3 (Masterpiece)_: Adds Ultimate Effects.
- **Slots**:
  - Main Weapon
  - Armor
  - Accessory (Ring/Amulet)

## 6. Implementation Notes

- **Manual Interaction**: Combat is not automated. Users must manually spend dice in the "Adventure" tab.
- **Backend Focus**: Initial focus is on implementing the backend logic and JSON storage. Inventory UI will be simplified for the MVP.
- **No Migration**: Since the project is in early development, no database migration for existing user data is required. Global state can be reset.

## 6. Proposals

### Improvements

1.  **Visual Feedback**: When an item is equipped, the avatar should reflect this (requires asset generation/management).
2.  **Sound FX**: "Ding" sound when completing a task that kills a minion.
3.  **Loot Box Effect**: When a Boss dies, show a "Chest Opening" animation for the rewards.
