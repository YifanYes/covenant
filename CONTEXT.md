# Covenant — Domain Context

Single-context project. Domain language and ubiquitous terms live here. ADRs live in `docs/adr/` once decisions crystallize.

## Glossary

### Target audience

The user the product is being built for. **Broader than the "Risk/Warhammer-literate optimiser" described in `docs/lore/Target.md`** — that doc describes the original aspirational persona, but the steering decision (2026-05-11, during combat redesign) is to widen the appeal. Concretely: mechanics that require learning RPG conventions (e.g. tabletop dice math) are now considered onboarding friction and removed. Optimiser depth still expected, but expressed through stat/build/loadout decisions rather than probability literacy.

### Quest

A single character's instanced run through an ordered sequence of combat encounters with a fixed objective (currently `KILL_ENEMIES`). One active quest per character at a time. Persisted in `character_quests`. Average length: 3–6 encounters mixing minions, elites, and a boss. See `docs/product/quest_system.md`.

### Encounter

One combat instance inside a Quest. Has its own `tacticalState` snapshot. Mana is topped up from reserve at encounter start (see Mana / Reserve).

### Ability (UI) / Ability (code)

A player-castable combat move with a `manaCost`. **UI-facing label is "Ability"; code identifier is `ability` / `ABILITIES`**. The split is intentional and load-bearing — renaming the code symbol is deferred to avoid a file-wide churn that doesn't change behavior.

### Mana

The single combat resource that gates Abilities. Lives on `CharacterClass.mana` (active, capped at `maxMana`). Replaces the prior dice-bank meta-currency. **No per-turn regen** — once spent, mana only refills via Reserve at the start of the next Encounter. `basic_strike` (power 35, 0 mana) is the always-available fallback when mana is empty.

### Reserve (mana reserve)

Uncapped overflow bank stored on `Character.manaReserve`. Real-life completions (tasks, habits, objectives, journal entries) grant Mana; surplus above `maxMana` overflows into Reserve. **Reserve refills `mana` to `maxMana` at the start of each Encounter, not mid-fight.** A single fight's mana budget is therefore exactly `maxMana` (no regen); Reserve only buys _additional_ fights in a row.

### RPG-views set (post-redesign)

Routes that adopt the NES.css visual system, Pixelify Sans body, and Press Start 2P display font: `/quests`, `/quests/[id]` (combat arena), `/inventory`, `/shop`, `/guilds`. All wrapped in a `.rpg-ui` scope class via a `(rpg)` route group layout. Scope leak prevented by PostCSS prefix-selector at build time (rewrites NES.css selectors to `.rpg-ui ...`).

**`/map` is deprecated and deleted in this rewrite** — references in the spec (`map/_components/enemy-card`, `map/_components/health-bar`) are obsolete. `health-bar.component.tsx` must be relocated before `/map` deletion since combat imports it.

Productivity-views set: `/tasks`, `/habits`, `/dashboard`, `/settings`, `/journaling`, `/objectives`, `/calendar`. Keep current Tailwind style and font stack.

### Beta scope (combat redesign)

- **Released classes:** Templar, Herald. Inquisitor and Demon Hunter are defined in `classes.ts` but have no Abilities (`abilities.ts`) — both are pre-release and out of beta scope.
- **Released tiers:** 1–3. Tier 4 (`level = 50`) is not in the beta; no T4 Abilities exist. Damage-formula tier→level mapping (`tier*10 + 10`) reserves L50 for post-beta content.

### Item stats (post-redesign)

Weapons add flat bonuses to attacker stats; armor adds to defender stats. Dice fields (`attackDice`, `physicalDefDice`, `magicDefDice`) are removed in Phase 2c — replaced by:

| Weapon `damageType` | Bonus field |
|---|---|
| `PHYSICAL` (formerly PHYSICAL or RANGED — RANGED collapsed in) | `strengthAtkBonus` |
| `MAGIC` | `magicAtkBonus` |

Armor: `strengthDefBonus`, `magicDefBonus`. Scaling factor for dice→flat: **×1** (old `attackDice: 5` → new `strengthAtkBonus: 5`). Balanced against the HP×5 rescale (path i from combat formula decision); a full T3 weapon roughly doubles class ATK, ~Pokémon Choice Band magnitude.

Weapon `range` field is dropped (no server consumer). Weapon `speed` is repurposed: it adds to the wielder's `TacticalUnitState.speed`, which the engine already reserves for turn order. **Class stats gain a new base `speed` field** (absent today); Pokémon-style higher-speed-acts-first ordering becomes part of Phase 2 scope. Tie = random.

### HP rescale + derivative values

Player and enemy HP are multiplied by ×5 in the combat-redesign rewrite to keep the Gen-1-style damage formula in a meaningful range. **Multiplication is applied to literals at the source**, not via a runtime constant — no `HP_RESCALE_FACTOR` import dependency. Same factor applied to:

- `CLASS_BASE_STATS[*].baseHealth`
- All `ENEMIES[*].health`
- DOT tick values: `BURNING: 1 → 5`, `PURIFIED: 1 → 5`, `POISONED: 2 → 10`
- `thornsDamage: 2 → 10` (karmic_retribution, retaliation)
- `health_potion.effect.healHealth: 3 → 15`

Mana values are **not** rescaled (maxMana stays 5–14 across classes/tiers).

### Consumables (post-redesign)

- `health_potion`: heals 15 HP mid-fight. Kept.
- `mana_potion`: **removed.** No mid-fight mana refill exists; per-fight mana budget = `maxMana` exactly, with Reserve top-up only at Encounter start. Migration: scrub `mana_potion` entries from `Character.inventory`/`loadout` JSON, refund 25 gold per row. `effect.healMana` field becomes dead and can be removed from `ItemDefinition`.
- No Herald-flavored heal Ability in the beta; deferred to post-beta content if users request.

### Mana feedback UX

- **Real-time grant feedback.** Completing a Task, Habit, Objective, or Journal entry must immediately update the visible mana state. `task.toggle` / `habit.complete` / `objective.complete` / `journal.create` mutations invalidate the character query so any mana indicator on screen updates within ~100ms. **Mana must be surfaced outside combat** — at minimum in `AppSidebar` or the dashboard header — otherwise the "real work = real power" loop is invisible during the bulk of a user's day.
- **Reserve display.** Small `+N` badge next to the `{mana}/{maxMana}` count on the combat MP bar and on the out-of-combat mana indicator. On hover, a tooltip shows the **today's** earnings breakdown: "Earned today: 12 habits +24, 4 tasks +12, 1 objective +10." Total reserve composition is not tracked (uncapped, multi-day); the breakdown is computed at request time from the day's completion logs × `MANA_REWARDS` table. Daily window resets at user-local midnight.

### Combat tiers

| Enemy role | Behavior                                  |
| ---------- | ----------------------------------------- |
| Minion     | Cheap, basic attack only, no mana economy |
| Elite      | Uses 1–2 Abilities per fight, mana 4–6    |
| Boss       | Full toolkit, mana 8–12                   |
