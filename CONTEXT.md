# Covenant — Domain Context

Single-context project. Domain language and ubiquitous terms live here. ADRs live in `docs/adr/` once decisions crystallize.

## Glossary

### Target audience

User product built for. **Broader than "Risk/Warhammer-literate optimiser" in `docs/lore/Target.md`** — that doc describes original aspirational persona, but steering decision (2026-05-11, during combat redesign) is to widen appeal. Concretely: mechanics requiring learning RPG conventions (e.g. tabletop dice math) now considered onboarding friction and removed. Optimiser depth still expected, but expressed through stat/build/loadout decisions rather than probability literacy.

### Quest

Single character's instanced run through ordered sequence of combat encounters with fixed objective (currently `KILL_ENEMIES`). One active quest per character at a time. Persisted in `character_quests`. Average length: 3–6 encounters mixing minions, elites, boss. See `docs/product/quest_system.md`.

### Encounter

One combat instance inside Quest. Has own `tacticalState` snapshot. Mana topped up from reserve at encounter start (see Mana / Reserve).

### Ability (UI) / Ability (code)

Player-castable combat move with `manaCost`. **UI-facing label is "Ability"; code identifier is `ability` / `ABILITIES`**. Split intentional and load-bearing — renaming code symbol deferred to avoid file-wide churn that doesn't change behavior.

### Mana

Single combat resource gating Abilities. Lives on `CharacterClass.mana` (active, capped at `maxMana`). Replaces prior dice-bank meta-currency. **No per-turn regen** — once spent, mana only refills via Reserve at start of next Encounter. `basic_strike` (power 35, 0 mana) is always-available fallback when mana empty.

### Reserve (mana reserve)

Uncapped overflow bank stored on `Character.manaReserve`. Real-life completions (tasks, habits, objectives, journal entries) grant Mana; surplus above `maxMana` overflows into Reserve. **Reserve refills `mana` to `maxMana` at start of each Encounter, not mid-fight.** Single fight's mana budget therefore exactly `maxMana` (no regen); Reserve only buys _additional_ fights in a row.

### RPG-views set (post-redesign)

Routes adopt NES.css visual system, Pixelify Sans body, Press Start 2P display font: `/quests`, `/quests/[id]` (combat arena), `/inventory`, `/shop`, `/guilds`, `/tavern`. All wrapped in `.rpg-ui` scope class via `(rpg)` route group layout. Scope leak prevented by PostCSS prefix-selector at build time (rewrites NES.css selectors to `.rpg-ui ...`).

**`/map` deprecated and deleted in this rewrite** — references in spec (`map/_components/enemy-card`, `map/_components/health-bar`) obsolete. `health-bar.component.tsx` must relocate before `/map` deletion since combat imports it.

Productivity-views set: `/tasks`, `/habits`, `/dashboard`, `/settings`, `/journaling`, `/objectives`, `/calendar`. Keep current Tailwind style and font stack.

### Beta scope (combat redesign)

- **Released classes:** Templar, Herald. Inquisitor and Demon Hunter defined in `classes.ts` but have no Abilities (`abilities.ts`) — both pre-release and out of beta scope.
- **Released tiers:** 1–3. Tier 4 (`level = 50`) not in beta; no T4 Abilities exist. Damage-formula tier→level mapping (`tier*10 + 10`) reserves L50 for post-beta content.

### Item stats (post-redesign)

Weapons add flat bonuses to attacker stats; armor adds to defender stats. Dice fields (`attackDice`, `physicalDefDice`, `magicDefDice`) removed in Phase 2c — replaced by:

| Weapon `damageType` | Bonus field |
|---|---|
| `PHYSICAL` (formerly PHYSICAL or RANGED — RANGED collapsed in) | `strengthAtkBonus` |
| `MAGIC` | `magicAtkBonus` |

Armor: `strengthDefBonus`, `magicDefBonus`. Scaling factor for dice→flat: **×1** (old `attackDice: 5` → new `strengthAtkBonus: 5`). Balanced against HP×5 rescale (path i from combat formula decision); full T3 weapon roughly doubles class ATK, ~Pokémon Choice Band magnitude.

Weapon `range` field dropped (no server consumer). Weapon `speed` repurposed: adds to wielder's `TacticalUnitState.speed`, which engine already reserves for turn order. **Class stats gain new base `speed` field** (absent today); Pokémon-style higher-speed-acts-first ordering becomes part of Phase 2 scope. Tie = random.

### HP rescale + derivative values

Player and enemy HP multiplied by ×5 in combat-redesign rewrite to keep Gen-1-style damage formula in meaningful range. **Multiplication applied to literals at source**, not via runtime constant — no `HP_RESCALE_FACTOR` import dependency. Same factor applied to:

- `CLASS_BASE_STATS[*].baseHealth`
- All `ENEMIES[*].health`
- DOT tick values: `BURNING: 1 → 5`, `PURIFIED: 1 → 5`, `POISONED: 2 → 10`
- `thornsDamage: 2 → 10` (karmic_retribution, retaliation)
- `health_potion.effect.healHealth: 3 → 15`

Mana values **not** rescaled (maxMana stays 5–14 across classes/tiers).

### Consumables (post-redesign)

- `health_potion`: heals 15 HP mid-fight. Kept.
- `mana_potion`: **removed.** No mid-fight mana refill exists; per-fight mana budget = `maxMana` exactly, with Reserve top-up only at Encounter start. Migration: scrub `mana_potion` entries from `Character.inventory`/`loadout` JSON, refund 25 gold per row. `effect.healMana` field becomes dead and can be removed from `ItemDefinition`.
- No Herald-flavored heal Ability in beta; deferred to post-beta content if users request.

### Mana feedback UX

- **Real-time grant feedback.** Completing Task, Habit, Objective, or Journal entry must immediately update visible mana state. `task.toggle` / `habit.complete` / `objective.complete` / `journal.create` mutations invalidate character query so any mana indicator on screen updates within ~100ms. **Mana must surface outside combat** — at minimum in `AppSidebar` or dashboard header — otherwise "real work = real power" loop invisible during bulk of user's day.
- **Reserve display.** Small `+N` badge next to `{mana}/{maxMana}` count on combat MP bar and on out-of-combat mana indicator. On hover, tooltip shows **today's** earnings breakdown: "Earned today: 12 habits +24, 4 tasks +12, 1 objective +10." Total reserve composition not tracked (uncapped, multi-day); breakdown computed at request time from day's completion logs × `MANA_REWARDS` table. Daily window resets at user-local midnight.

### Combat tiers

| Enemy role | Behavior                                  |
| ---------- | ----------------------------------------- |
| Minion     | Cheap, basic attack only, no mana economy |
| Elite      | Uses 1–2 Abilities per fight, mana 4–6    |
| Boss       | Full toolkit, mana 8–12                   |
