# Combat System

Pokémon-style turn-based combat. Replaced the dice-roll system in Phase 2A of the combat redesign (commit `fb73e42`). Canonical glossary in `CONTEXT.md`.

## Overview

A **Quest** is one character's run through an ordered sequence of **Encounters**. Each Encounter is a single combat instance with one enemy. Player wins by reducing enemy HP to 0; loses if their own HP hits 0. Average quest length: 3–6 encounters mixing minions, elites, and a boss.

Combat is fought through **Abilities** — castable moves gated by **Mana**. Mana itself is earned by completing real-life productivity actions (tasks, habits, objectives, journal entries). The loop is intentional: real work fuels in-game power.

## Resources

### HP (Health)

- Lives on `CharacterClass.health` (active class) and `EnemyState.currentHealth`.
- Multiplied ×5 across all literals (class base, enemy templates, DOT ticks, thorns, potions) to calibrate the Gen-1 damage formula to 3–4 hit fights at parity tier.
- Persists across encounters within a quest. Restored on quest start / character revive.

### Mana

- Single combat resource. Lives on `CharacterClass.mana` (active, capped at `maxMana`).
- **No per-turn regen.** Once spent in an Encounter, mana refills only via Reserve top-up at the next Encounter start.
- Per-fight budget = `maxMana` exactly. `maxMana` range 5–14 across class/tier.
- `basic_strike` (power 35, 0 mana, PHYSICAL) is the always-available fallback when mana is empty.

### Reserve

- Uncapped overflow bank on `Character.manaReserve`.
- Real-life completions grant mana via `MANA_REWARDS` (`src/shared/constants/rewards.ts`):

  | Source                      | Grant |
  | --------------------------- | ----- |
  | Habit complete              | +2    |
  | Task complete (low impact)  | +1    |
  | Task complete (mid impact)  | +3    |
  | Task complete (high impact) | +5    |
  | Objective complete          | +10   |
  | Journal entry               | +1    |

- Surplus above `maxMana` overflows into Reserve.
- Reserve refills `mana` to `maxMana` at the start of each Encounter (not mid-fight). Slow days mean one fight per session at base `maxMana`; productive days stock enough for multiple fights in a row.

## Turn Structure

1. **Encounter start.** `topUpFromReserve` drains Reserve into active mana up to `maxMana`. Status effects and active buffs from prior encounter cleared.
2. **Turn order computed from `TacticalUnitState.speed`.** Higher speed acts first. Tie = random. `speed` is the sum of `CharacterClass.speed` base (Templar 1, Herald 3, Inquisitor 2, Demon Hunter 3) plus equipped weapon `speed`.
3. **On caster's turn:**
   - Start-of-turn DOT ticks (BURNING / PURIFIED / POISONED) resolve. Lethal DOT triggers defeat path immediately (including `processEnemyDefeat` → gold + next spawn).
   - Expired buffs are dropped (`activeAbilities[id].remainingTurns <= 0`).
   - Caster selects a move; engine validates affordability + IMMOBILIZED status.
   - If the move resolves damage, `combat-formula.ts` runs (see below). Side effects (status application, recoil, self-buff, cleanse, Protect, thorns) apply.
   - Caster's `currentMana` is decremented in tactical state and (for player) written back to `CharacterClass.mana` row.
4. **Hand-off.** Other unit's turn begins. `potionUsedThisTurn` flag is cleared when the non-player turn completes.

## Damage Formula

```
level    = unit.tier * 10 + 10           // tier 1 → L20, tier 2 → L30, tier 3 → L40
variance = 0.85 + Math.random() * 0.30   // ±15%
isCrit   = Math.random() < 1/16          // 6.25% base, 2× damage
damage   = floor((((2*L/5 + 2) * power * atk/def) / 50) + 2) * variance * (isCrit ? 2 : 1)
```

- `atk` = caster `strengthAtk` or `magicAtk`, picked by move `damageType`.
- `def` = matching defender stat (`strengthDef` or `magicDef`), floored at 1.
- Self-buffs / Protect / cleanse / thorns moves carry no `power` — they apply side effects only.
- Implementation in `src/server/utils/combat/combat-formula.ts`; orchestration in `move-resolution.ts`.

## Abilities

20 entries in `src/shared/constants/abilities.ts`. 19 class-bound (Templar + Herald only — Inquisitor and Demon Hunter are out of beta) plus `basic_strike` as the universal fallback. Distribution:

- **10 damage moves** — direct damage, optionally with status side effects or recoil.
- **3 buffs** — `light_shield` (+DEF 2t), `audacity` (+ATK 2t), `inspiration` (+ATK 2t, scales with enemy tier).
- **3 Protect** — `miraculous_protection`, `mana_barrier`, `iron_bastion` — full block for 1 turn.
- **2 thorns** — `karmic_retribution`, `retaliation` — reflect 10 damage on melee hit for 2 turns.
- **1 cleanse** — `nullify` — strip own debuffs.

Effect semantics live on `AbilityEffectType`. The enum was retained from the dice system but reinterpreted: `POWER_MODIFIER` (SELF) is `+N% ATK`, `THRESHOLD_MODIFIER` (SELF) is `+N% DEF`, `GUARANTEED_CRITICAL` value 1 = guaranteed crit / value ≥ 2 = +N% crit chance, `NEGATE_HITS` value ≥ 1 = Protect, `NEGATE_HITS` value 0 + `thornsDamage` = thorns reflect, `HEAL` value 0 = cleanse.

## Status Effects

`StatusEffect` enum in `src/shared/types/ability.types.ts`:

| Status        | Effect                                                        |
| ------------- | ------------------------------------------------------------- |
| `BURNING`     | 5 HP at start of turn (DOT)                                   |
| `PURIFIED`    | 5 HP at start of turn (DOT, magic-flavored)                   |
| `POISONED`    | 10 HP at start of turn (DOT)                                  |
| `IMMOBILIZED` | Caster skips their turn (mana cost still paid? — no, blocked) |

Status duration counted in turns; tracked under `activeAbilities[id].remainingTurns` shape (overloaded for both buffs and statuses).

## Enemy AI

`executeEnemyMove` in `move-resolution.ts`. Selection algorithm:

1. Build pool from `enemy.moves[]`. Fall back to `['basic_strike']` if empty.
2. Filter out moves where `manaCost > currentMana`.
3. If `currentHealth / maxHealth ≤ 0.3`, restrict to damage moves (`isDamageMove`). If that empties the pool, revert to the affordable set.
4. Sort by `manaCost` descending. Pick uniformly at random among highest-cost entries (most-expensive-affordable, not literal-cheapest — literal-cheapest would always pick `basic_strike` and defeat curated movesets).
5. Final fallback: `basic_strike`.

Enemy mana drains correctly across turns (latent 2A bug fixed in 2B). DOT-kills on the enemy's own turn trigger defeat + gold + next spawn path.

## Items + Class Stats

Items contribute flat bonuses (no dice). `src/shared/constants/items.ts`:

- **Weapons:** `strengthAtkBonus` or `magicAtkBonus` (routed by weapon `damageType`); `speed` adds to turn order.
- **Armor:** `strengthDefBonus`, `magicDefBonus`.
- **Scaling factor ×1** vs old dice values (old `attackDice: 5` → new `strengthAtkBonus: 5`). A full T3 weapon roughly doubles class ATK (~Pokémon Choice Band magnitude).

`mana_potion` is removed — no mid-fight mana refill exists. `health_potion` heals 15 HP (×5 rescaled). Existing `mana_potion` rows are scrubbed at runtime by `ManaService.scrubManaPotions` with 25g refund per row (idempotent, currently uncalled — see TODO).

`CLASS_BASE_STATS` and `CLASS_INITIAL_STATS` carry a `speed` base. `TacticalUnitState` snapshots `speed` / `strengthAtk` / `strengthDef` / `magicAtk` / `magicDef` / `tier` / `moves` at quest start; combat reads from the snapshot rather than re-aggregating items each turn. The snapshot is reconciled against `currentClass` on read (`QuestService.getTacticalState`) so mid-flight max-HP / max-MP bumps from rescales or revive flow through correctly.

## UX Surfaces

- **Combat arena** (`/quests/[questId]`) — player + enemy sprite panels, HP/MP bars, combat log, ability action bar. Active mana count shows `{mana}/{maxMana}` with a `+N` Reserve badge; hover shows today's earnings breakdown computed from completion logs.
- **App sidebar** — out-of-combat mana indicator. Mutation handlers (`task.toggle`, `habit.complete`, `objective.complete`, `journal.create`) invalidate the `character.get` query so the indicator updates within ~100ms.
- **Inventory abilities tab** — shows class ability catalog with equip/unequip controls. Ultimate-tier abilities keep an amber border accent.
- **Visual chrome** — RPG views (`/quests`, `/quests/[id]`, `/inventory`, `/shop`, `/guilds`) wrapped in `.rpg-ui` scope. NES.css is loaded for fonts (Pixelify Sans body 400/600, Press Start 2P display 400) but components use a `panelChrome` Tailwind shim (`src/components/rpg/rpg-styles.ts`) rather than real `nes-container`. Productivity views (`/tasks`, `/dashboard`, etc.) keep the existing Tailwind theme; PostCSS prefix-selector prevents leak.

## Defeat Flow

`processEnemyDefeat` (`src/server/utils/combat/rewards.ts`) — gold credited, quest `progress` incremented, next enemy spawned if quest not complete, kill record written. Triggered from both player-kill (move resolves lethal damage) and DOT-kill (enemy dies on start-of-turn tick).

Player defeat — `CharacterService.revive` resets HP, character returns to `/quests` board; active quest is preserved and resumes on next entry.

## Known Limits (Beta)

- **No Tier 4 abilities** for any class. Tier 4 enemies have placeholder movesets.
- **Inquisitor + Demon Hunter** have no defined abilities at any tier — they ship class-stat-only.
- **Balance is untuned** beyond fight-count tests. Empirical playtest data still to come.
- **No combat e2e tests.** Move-resolution covered by unit + integration suites; combat orchestration verified by manual playthrough.
- **No sound, no animation polish.** Tracked as Combat Phase 3 in `TODO.md` Backlog.

## Source map

| Surface          | File                                                        |
| ---------------- | ----------------------------------------------------------- |
| Damage formula   | `src/server/utils/combat/combat-formula.ts`                 |
| Move resolution  | `src/server/utils/combat/move-resolution.ts`                |
| Defeat + rewards | `src/server/utils/combat/rewards.ts`                        |
| Mana economy     | `src/server/services/mana.service.ts`                       |
| Encounter top-up | `src/server/services/quest.service.ts`                      |
| Ability catalog  | `src/shared/constants/abilities.ts`                         |
| Enemy templates  | `src/shared/constants/enemies.ts`                           |
| Mana rewards     | `src/shared/constants/rewards.ts`                           |
| Items + stats    | `src/shared/constants/items.ts`, `classes.ts`               |
| Combat UI        | `src/components/combat/`                                    |
| Combat hook      | `src/hooks/use-combat.hook.ts`                              |
| tRPC entry       | `quest.executeMove` in `src/server/routers/quest.router.ts` |
| State schema     | `src/shared/types/tactical-combat.types.ts`                 |

See also: `docs/product/quest_system.md`, `docs/specs/combat_redesign.md`, `CONTEXT.md`.
