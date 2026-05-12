# Combat Redesign — Implementation Spec

> This spec was refined through a `grill-with-docs` session on 2026-05-11. Domain glossary and resolved terms live in `CONTEXT.md` at the repo root. Where this spec and `CONTEXT.md` overlap, `CONTEXT.md` is the source of truth for terminology; this spec is the source of truth for implementation steps.

## Context

A user tested the app and gave feedback covering bugs, design pivots, and one feature request. Decided scope:

1. Player/enemy sprite + MP bar render bugs (small)
2. Add date format setting (small, ~12 call sites)
3. Add enemy MP bar (feature; surfaces enemy mana for new combat)
4. Replace dice combat with Pokémon-style combat (large) — **full cutover, no coexistence with old system**
5. **Mana from real-life completions** — finishing tasks/habits/objectives/journals grants character mana, replacing the old dice-bank meta-progression sink
6. **Migrate RPG views to NES.css** — combat, inventory, quest, shop, guild screens

### Important context

- **Target audience widened.** `docs/lore/Target.md` describes a Risk/Warhammer-literate optimiser. The product is being steered toward a broader audience; mechanics that require learning RPG conventions (e.g. tabletop dice math) are now considered onboarding friction and removed. Optimiser depth still expected — expressed through stat/build/loadout decisions rather than probability literacy.
- **"Doesn't feel gamy" is not a dice problem.** It's animations / sound / lore / juice / world-building. Replacing dice will not fix the vibe complaint. That work is a separate Phase 3 (deferred — not in this plan).
- **Phase 1 ships independently in days.** Bugs + date format do not depend on combat redesign. Branch off `main`, not the current `feat/guilds` branch.
- **`/map` is deprecated and deleted as part of this rewrite.** `health-bar.component.tsx` (currently at `src/app/(workspace)/map/_components/health-bar.component.tsx`) must be relocated to `src/components/combat/` before `/map` deletion, since combat imports it.
- **Inquisitor and Demon Hunter classes have no Abilities defined** in `src/shared/constants/abilities.ts`. Both are out of beta scope. **Tier 4 is post-beta**; no T4 Abilities exist for any class.
- **"Enemy MP bar" the tester reported is ambiguous.** Enemies have no MP bar in code today. Treated as a feature request (correct fit for Pokémon-style combat where enemies use moves). Phase 1 fixes the _player_ MP NaN bug regardless.

### Locked decisions

#### Mana reward table (tunable post-launch)

| Source                      | Mana grant |
| --------------------------- | ---------- |
| Habit complete              | +2         |
| Task complete (low impact)  | +1         |
| Task complete (mid impact)  | +3         |
| Task complete (high impact) | +5         |
| Objective complete          | +10        |
| Journal entry               | +1         |

#### Resource model

- **No mana regen.** Per-fight mana budget = `maxMana` exactly. Once spent in an Encounter, mana only refills via Reserve top-up at the next Encounter start.
- **Reserve bank.** Surplus mana from completions overflows into `Character.manaReserve` (uncapped, separate from combat `mana`). Reserve **refills active mana to `maxMana` at the start of each Encounter** (not mid-fight). A productive day stocks enough Reserve for multiple fights in a row; a slow day means each fight starts at the base `maxMana` budget.
- **Basic attack: `basic_strike`, power 35, 0 mana, PHYSICAL.** Pokémon Tackle tier. Always-available fallback when mana is empty.
- **`mana_potion` removed.** No mid-fight mana refill mechanism. Existing inventory rows are scrubbed; 25g refunded per row.

#### Damage formula

```
level    = currentClass.tier * 10 + 10   // tier 1 → L20, tier 2 → L30, tier 3 → L40
variance = 0.85 + Math.random() * 0.30   // ±15%
isCrit   = Math.random() < 1/16          // 6.25%, 2× damage
damage   = floor((((2*L/5 + 2) * power * atk/def) / 50) + 2) * variance * (isCrit ? 2 : 1)
```

`atk` = caster's `strengthAtk` or `magicAtk` per move's `damageType`. `def` = matching enemy stat, floor 1. Enemies use the same formula with `level = enemy.tier * 10 + 10`.

#### HP rescale (×5)

Player and enemy HP literals multiplied by 5 at the source — no runtime `HP_RESCALE_FACTOR` constant. Calibrates the Gen-1 formula to land in 1/3–1/4 of HP per hit, yielding 3–4 turn fights at parity tier.

Applies to:

- `CLASS_BASE_STATS[*].baseHealth` (Templar 6→30, Herald 3→15, Inquisitor 6→30, Demon Hunter 4→20)
- All `ENEMIES[*].health` values
- DOT tick values: `BURNING: 1→5`, `PURIFIED: 1→5`, `POISONED: 2→10`
- `thornsDamage: 2 → 10` (karmic_retribution, retaliation)
- `health_potion.effect.healHealth: 3 → 15`

Mana values are **not** rescaled; `maxMana` stays in the 5–14 range across class/tier.

#### Ability translation table

Beta scope: 19 abilities, Templar + Herald only. Each entry receives `power`, `damageType`, `recoilPercent` (where applicable). Add `basic_strike` as the 20th catalog entry.

| ID                      | T   | Class       | Mana | Old effect                         | New `power` | `damageType` | `recoilPercent` | Side-effect / notes                   |
| ----------------------- | --- | ----------- | ---- | ---------------------------------- | ----------- | ------------ | --------------- | ------------------------------------- |
| `basic_strike`          | —   | (universal) | 0    | (new)                              | 35          | PHYSICAL     | —               | always available                      |
| `truth_blade`           | 1   | Templar     | 3    | APPLY_STATUS PURIFIED              | 30          | MAGIC        | —               | + PURIFIED 2t                         |
| `miraculous_protection` | 1   | Templar     | 3    | NEGATE_HITS 1                      | —           | —            | —               | Protect (full block) 1 turn           |
| `shoulder_charge`       | 1   | Templar     | 2    | POWER_MOD +1                       | 50          | PHYSICAL     | —               | direct phys                           |
| `reckless_strike`       | 1   | Templar     | 3    | POWER_MOD +2, def→0                | 70          | PHYSICAL     | 25              | recoil                                |
| `light_shield`          | 2   | Templar     | 3    | THRESHOLD_MOD −1                   | —           | —            | —               | +DEF buff 2t                          |
| `precise_strike`        | 2   | Templar     | 3    | GUARANTEED_CRIT 5                  | 50          | PHYSICAL     | —               | +crit chance 50% this hit             |
| `audacity`              | 2   | Templar     | 4    | POWER_MOD +2                       | —           | —            | —               | +ATK 50% buff 2t                      |
| `iron_bastion`          | 3   | Templar     | 6    | NEGATE_HITS 99 (ult)               | —           | —            | —               | Protect full block 1 turn             |
| `kings_sword`           | 3   | Templar     | 7    | THRESHOLD_MOD −2 (ult)             | 90          | PHYSICAL     | —               | high-power phys                       |
| `wrath_avatar`          | 3   | Templar     | 8    | GUARANTEED_CRIT (ult)              | 100         | PHYSICAL     | —               | guaranteed crit                       |
| `karmic_retribution`    | 3   | Templar     | 8    | NEGATE_HITS 0 thorns 2             | —           | —            | —               | thorns shield 2t (`thornsDamage: 10`) |
| `plasma_missile`        | 1   | Herald      | 3    | POWER_MOD +4                       | 50          | MAGIC        | —               | direct magic                          |
| `ice_lance`             | 1   | Herald      | 3    | APPLY_STATUS IMMOBILIZED           | 40          | MAGIC        | —               | + IMMOBILIZED 1t                      |
| `mana_barrier`          | 1   | Herald      | 3    | NEGATE_HITS 1 magic                | —           | —            | —               | Protect 1t (simplified to full block) |
| `frost_bite`            | 1   | Herald      | 3    | POWER_MOD enemy −2                 | 30          | MAGIC        | —               | + ATK debuff 1t (−30%)                |
| `nullify`               | 2   | Herald      | 4    | HEAL value 0 (cleanse)             | —           | —            | —               | Cleanse own debuffs                   |
| `inspiration`           | 3   | Herald      | 6    | POWER_MOD +4 scalesWithEnemyTier   | —           | —            | —               | +ATK% buff 2t, +25% per enemy tier    |
| `stellar_collapse`      | 3   | Herald      | 10   | POWER_MOD +10 sixesExtraHits (ult) | 110         | MAGIC        | —               | ultimate magic                        |
| `retaliation`           | 3   | Herald      | 8    | NEGATE_HITS 0 thorns 2             | —           | —            | —               | thorns shield 2t (`thornsDamage: 10`) |

Distribution: 10 damage moves, 3 buffs (light_shield, audacity, inspiration), 3 Protect (miraculous_protection, mana_barrier, iron_bastion), 2 thorns (karmic_retribution, retaliation), 1 cleanse (nullify).

#### Items

- **Dice fields removed** from `src/shared/constants/items.ts`: `attackDice`, `physicalDefDice`, `magicDefDice`.
- **Flat bonus fields added** (Int): `strengthAtkBonus`, `strengthDefBonus`, `magicAtkBonus`, `magicDefBonus`.
- **Scaling factor: ×1.** Old `attackDice: 5` → new `strengthAtkBonus: 5`. Calibrated against the HP×5 rescale; a full T3 weapon roughly doubles class ATK (≈ Pokémon Choice Band magnitude).
- **Weapon `damageType`** routes which stat the bonus adds to: `PHYSICAL` → `strengthAtkBonus`; `MAGIC` → `magicAtkBonus`. **`WeaponDamageType.RANGED` collapsed into PHYSICAL** for stat-application purposes (the `ItemType.WEAPON_RANGED` item-category variant survives for flavor/icons; bow weapons still use `damageType: PHYSICAL`, which they already do in the existing data).
- **Weapon `range` field dropped** — no server consumer existed.
- **Weapon `speed` repurposed for turn order.** Adds to wielder's `TacticalUnitState.speed`. Pokémon-style higher-speed-acts-first ordering; tie = random. **Requires a new `speed` base stat on `CLASS_INITIAL_STATS` and `CLASS_BASE_STATS`** (currently absent). Class speed proposed: Templar 1, Herald 3, Inquisitor 2, Demon Hunter 3 (tunable). Enemy templates already carry `speed: 1`.

#### Naming

- **UI label: "Abilities"** (was "Abilities" in copy). Code identifiers (`ABILITIES`, `ability.types.ts`, `getAbilityById`, etc.) stay unchanged — UI/i18n strings only. Internal symbol rename deferred.

#### NES.css migration

- **RPG-views set:** `/quests`, `/quests/[id]` (combat arena), `/inventory`, `/shop`, `/guilds`. All wrapped in a `.rpg-ui` scope class via a `(rpg)` route group layout. `/map` is deprecated and deleted; not in the set.
- **Productivity-views set:** `/tasks`, `/habits`, `/dashboard`, `/settings`, `/journaling`, `/objectives`, `/calendar`. Keep current Tailwind style and font stack.
- **Scope leak prevention: PostCSS prefix-selector plugin** rewrites every NES.css selector to `.rpg-ui ...` at build time. Required because NES.css ships generic resets (`html`, `body`, `*`) that `@scope` cannot reliably contain. Plugin choice: `postcss-prefix-selector` (npm package).
- **Existing `RPGLayout`/`ProductivityLayout` distinction** in `src/app/(workspace)/layout.tsx` is realigned to the new view-sets (`/guilds` and `/shop` join NES.css; `/map` deleted).

#### Fonts (RPG views only)

- **Pixelify Sans — body.** Two weights only: **400, 600**. Loaded via `next/font/google` with `variable: '--font-rpg-body'`. (Spec previously called for 4 weights; reduced to 2 for payload budget — bold for damage numbers / mana costs only.)
- **Press Start 2P — display only.** Single weight 400, confined to titles at 24px+ (clamp 24–48px). Loaded via `next/font/google` with `variable: '--font-rpg-display'`.
- Productivity views: font stack untouched.

#### Mana feedback UX

- **Real-time grant feedback.** `task.toggle`, `habit.complete`, `objective.complete`, and `journal.create` mutations invalidate the character query so the visible mana state updates within ~100ms. **Mana must be surfaced outside combat** (in `AppSidebar` or the dashboard header) — otherwise the productivity↔combat loop is invisible during the user's working day.
- **Reserve `+N` badge with hover tooltip.** Badge sits next to the `{mana}/{maxMana}` count on the combat MP bar and on the out-of-combat mana indicator. Hover shows today's earnings breakdown: "Earned today: 12 habits +24, 4 tasks +12, 1 objective +10." Computed at request time from the day's completion logs × `MANA_REWARDS` table; daily window resets at user-local midnight. Total reserve composition is not tracked (uncapped, multi-day).

#### Cutover atomicity

- **No feature flag. No coexistence.** Old dice system removed in Phase 2.
- **Sub-phases 2a + 2b + 2c collapse into one atomic PR** (renamed **2A** below). `main` is not shippable with any of these three landing alone — they form one logical unit (server engine + client UI + mana service + items + dashboard). Inside the PR, commits can still be granular for review.
- **2B (AI/balance/i18n) and 2C (NES.css migration for non-combat views) ship as separate PRs** after 2A.

#### TACTICAL_STATE_VERSION

Two bumps:

- Phase 1C: **2 → 3** (enemy MP fields added to `TacticalUnitState`).
- Phase 2A: **3 → 4** (mana resource model semantics + `speed` field hydration).

Stale persisted states between bumps are invalidated. There is no migration path — quest state resets on bump.

---

## Phase 1 — Bugs + Date Format + Enemy MP Bar (SHIPPED)

Single PR off `main`. See "implementation deviations" below for what actually merged.

- **1A — Sprite render bug.** `src/hooks/use-combat.hook.ts` read `existing?.templateId ?? ''` on cache miss → `/assets/enemies/default.png` 404. Fix: read `u.templateId` directly from server-authoritative `TacticalUnitState`.
- **1B — Player MP NaN.** `player-info.component.tsx`: `(mana/maxMana)*100` = `NaN` when `maxMana ≤ 0`. Guarded + bounds-clamped. `use-combat.hook.ts` syncs `playerMana`/`playerMaxMana` from `playerUnit` tactical state, fallback to `currentClass.mana`/`maxMana`.
- **1C — Enemy MP bar (feature).** `EnemyState` + `TacticalUnitState` gained `currentMana`/`maxMana`. `TACTICAL_STATE_VERSION` 2→3. `enemy-info.component.tsx` stacks MP under HP, hidden when `maxMana === 0`. Hydrated from `EnemyTemplate.mana`.
- **1D — Date format setting.** `User.dateFormat` DB column (mirrors `User.locale` shape). Options: `locale | iso | us | eu`. Settings UI `SingleSelect` added; tRPC mutation wired; ~6 full-date call sites migrated; i18n keys added.

### Phase 1 deliverables

- 1× Prisma migration: `User.dateFormat` column.
- 0 schema changes for combat (`TACTICAL_STATE_VERSION` bump only).
- ~6 modified files for bugs + MP bar.
- ~14 modified files for date format.

### Phase 1 — implementation deviations from spec

Recorded after landing Phase 1. Spec text above is the original plan; the deltas below are what actually shipped and why.

- **Date-format util/hook not created.** Spec proposed new `src/utils/format-date.util.ts` + `src/hooks/use-format-date.hook.ts`. Existing `src/hooks/use-date-format.ts` (shipped earlier in commit `0434c12`) is functionally equivalent — same `(date) => string` shape, reads `User.dateFormat` via the preferences store. Reusing it avoided duplicate infra. Settings UI, store, schema column, and i18n keys (`settings.date_format_options.*`) were already wired up in that earlier commit.
- **`DATE_FORMATS` stores raw dayjs format strings, not semantic names.** Spec proposed `"locale" | "iso" | "us" | "eu"`. The shipped enum is `['L', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY']` — passed directly to `dayjs(date).format(...)`. No mapping layer needed. Pragmatic; downside is the value leaks dayjs's format vocabulary into the user preference.
- **`User.dateFormat` schema column already present, no new migration this round.** Column shipped in commit `0434c12` (`prisma/schema.prisma:21`). No corresponding file under `prisma/migrations/`; project appears to use `prisma db push` for the dev schema. Treat the "1× Prisma migration" item in deliverables as already-merged history, not Phase-1 work.
- **`TacticalUnitState.currentMana` / `maxMana` are optional (`?:`); `EnemyState`'s are required.** Spec called for required on both. Required on `TacticalUnitState` would have forced edits to ~14 inline state constructions across `combat.service.test.ts` purely to add `currentMana: 0, maxMana: 0`. The hook bridges the asymmetry with `u.currentMana ?? 0` (matches spec's own sample at the hook layer). `templateId` is still required on `TacticalUnitState` so the sprite fix can read it directly without a fallback.
- **Enemy mana hydrated client-side at quest page, not server-side.** `src/app/(workspace)/quests/[questId]/page.tsx` calls `getEnemy(templateId)` and uses `template.mana` for both `currentMana` and `maxMana` on the `EnemyState` it passes to `CombatArena`. Server-side `activeEnemy` payload (from `getActiveQuest`) was not extended with mana fields. Acceptable in Phase 1 because no mana spending exists yet; Phase 2A will move the source of truth server-side when moves consume mana.
- **`createInitialTacticalState` / `createTacticalStateWithNewEnemy` signatures grew, not state shape.** Both now take explicit `enemyTemplateId`, `playerMana`/`enemyMana` args (or `newEnemyTemplateId`/`newEnemyMana` for the spawn variant). Spec implied the constructors would "just" hydrate from existing inputs, but neither had `templateId` or mana available without the caller passing them in.
- **Call-site list pruned to full-date displays.** Spec listed `member-list.component.tsx` and (via "remaining call sites") `entry-list.component.tsx`. Both are partial-date formatters (`{ month: 'short', year: 'numeric' }` and `{ weekday: 'short', month: 'short', day: 'numeric' }`) — they fall under spec's own "Leave 'DD MMM' and 'MMMM YYYY' formatters alone" rule. Left unchanged. Migrated set was: `task-table`, `objective-card`, `dashboard` (already migrated pre-Phase-1), plus `habit-card`, `objective-habit-card`, `mood-calendar`, `day-details-dialog` (this round).
- **UI not browser-verified before this writeup.** Per `CLAUDE.md`, frontend visual changes (sprite path, MP bars, date displays) should be exercised in `pnpm dev`. Code/tests are green; manual playthrough of combat + habit calendar + calendar day-details dialog still required before declaring Phase 1 visually correct.

---

## Phase 2 — Pokémon-style Combat Rewrite (full cutover)

**No feature flag. No coexistence.** Old dice system removed in Phase 2A. Sub-phase boundaries below:

- **2A** — atomic PR covering server engine, client UI, mana service, items, and dashboard. `main` is shippable only when all three former sub-phases (2a/2b/2c) land together.
- **2B** — enemy AI, balance pass, i18n cleanup. Independent PR.
- **2C** — NES.css migration for non-combat RPG views (`/inventory`, `/shop`, `/guilds`). Independent PR.

### Schema impact

- **Prisma migration 1:** add `Character.manaReserve Int @default(0)` (Reserve column).
- **Prisma migration 2:** drop `data.diceBank` from `Character.data` JSON default — `prisma/schema.prisma:86` `@default("{\"diceBank\": 0}")` → `@default("{}")`. Existing rows' `data.diceBank` becomes ignored on read. Can be folded into migration 1 if the migrations land together.
- **Data scrub (Phase 2A migration):** scan all `Character.inventory` and `Character.loadout` JSON for entries with `definitionId === 'mana_potion'`. Remove them and credit `gold += 25 × count` per character. Runs once on deploy; log a count for audit.
- `TacticalUnitState` extended in Phase 1C already includes `currentMana`/`maxMana`. Phase 2A extends it with `speed` if missing.
- `AbilityDefinition` (`src/shared/types/ability.types.ts`) extended with optional `power?: number`, `damageType?: 'PHYSICAL' | 'MAGIC'`, `recoilPercent?: number`.
- `EnemyTemplate.moves: string[]` — code-only field in `src/shared/constants/enemies.ts`. `EnemyTemplate.mana` already exists; hydrate it into `TacticalUnitState`.
- **Items schema:** drop `attackDice`/`physicalDefDice`/`magicDefDice` from `src/shared/constants/items.ts`. Add `strengthAtkBonus`/`strengthDefBonus`/`magicAtkBonus`/`magicDefBonus` (Int). Drop `range`. Keep `speed` (repurposed for turn order).
- `CLASS_INITIAL_STATS` and `CLASS_BASE_STATS` gain a `speed: number` base value (proposed: Templar 1, Herald 3, Inquisitor 2, Demon Hunter 3).

### Phase 2A — implementation deviations from spec

Recorded after landing Phase 2A. Spec text below is the original plan; the deltas here are what actually shipped and why.

- **`/map` deleted in 2A instead of 2C.** Spec staged the `/map` directory deletion in Phase 2C, but the obsolete `dice-roller`/`dice-result`/`enemy-card`/`combat-log` components inside `map/_components/` referenced types (`DiceRollResult`, `attackRolls`) that 2A removes. Either keep ghost files with broken imports (no, won't compile) or delete `/map` now. Chose the latter. `health-bar.component.tsx` was relocated to `src/components/combat/` (per spec); `combat-log.component.tsx` was also relocated there since `inventory/kill-record-detail-dialog.component.tsx` still imports it.
- **`combat.service.ts` reshaped to a thin client of `move-resolution`.** Old wrappers (`executeTacticalAttack`/`executeTacticalAbility`/`useSelfBuffAbility`/`useAbility`/`getActiveAbilityBuffs`/`clearConsumedAbilities`/`rollDice`/`calculateHitsWithCount`) all dropped. Surface now: `useConsumable`, `playerExecuteMove`, `playerEnemyTurn`, `playerUsePotion`. `useAbility` (legacy non-tactical ability endpoint) and `useAbilitySchema` were both unused by clients, so the `character.useAbility` tRPC route was removed too.
- **Ability effect semantics re-interpreted in place.** Rather than introducing new effect-type variants, Phase 2A reuses the existing `AbilityEffectType` enum with new meaning: `POWER_MODIFIER` (SELF) is `+N% ATK` (was: `+N dice`), `THRESHOLD_MODIFIER` (SELF) is `+N% DEF`, `GUARANTEED_CRITICAL` value 1 = guaranteed crit, value ≥ 2 = `+N% crit chance`, `NEGATE_HITS` value ≥ 1 = Protect for 1 turn (full block), `NEGATE_HITS` value 0 + `thornsDamage` = thorns reflect, `HEAL` value 0 = cleanse. Abilities also carry new top-level `power` / `damageType` / `recoilPercent` fields when they resolve damage via the formula. Renaming the enum members across the file would have churned tests and i18n without changing runtime behavior; left for future cleanup.
- **`basic_strike` lives in `ABILITIES` (universal).** `AbilityDefinition.className` widened to `CharacterClassName | 'universal'` and `magicNature` widened to `MagicNature | 'universal'` so `basic_strike` can coexist with class-bound abilities. `getAvailableAbilities` filters out universal entries so it doesn't show up in inventory equip lists.
- **NES.css scope: PostCSS prefix-selector wired; layout segment NOT created.** Spec called for a new `(rpg)` route group layout. The existing `rpg-layout.tsx` (already gating the workspace's RPG views) is the more pragmatic place to load NES.css + the two `next/font/google` fonts and apply the `.rpg-ui` class. PostCSS config (`postcss.config.mjs`) now rewrites every selector from `nes.css/css/nes.min.css` to live under `.rpg-ui`, including the `html`/`body`/`*` resets. Productivity routes (`/tasks`, `/dashboard`, etc.) flow through `productivity-layout.tsx` unchanged.
- **Schema strategy: `prisma db push`, no SQL migration file authored.** Schema now has `Character.manaReserve Int @default(0)`, `Character.data` default `"{}"`, and `CharacterClass.speed Int @default(1)`. Following Phase 1's pattern (project uses `db push`), no file was added under `prisma/migrations/`. **`mana_potion` scrub is a runtime, idempotent op** in `ManaService.scrubManaPotions` — guarded by `Character.data.scrubbedManaPotions=true`, called from… nowhere automatically. To run it for an existing user, invoke via a one-off script or call site (e.g. add to `CharacterService.getCurrentClass`). Left explicitly uncalled because the dev DB likely has no real `mana_potion` rows.
- **Player class-stat snapshot at combat init, not live-recompute.** `TacticalUnitState` now carries `speed`, `strengthAtk`, `strengthDef`, `magicAtk`, `magicDef`, optional `tier`/`moves`. These are populated once in `QuestService.createInitialTacticalState` (and `createTacticalStateWithNewEnemy` for spawns) from the character class + loadout aggregate. Combat-formula reads these directly instead of looking up the character or re-aggregating items each turn.
- **Enemy AI: pick cheapest affordable move from `enemy.moves[]`.** All tier 1–4 enemies currently have `moves: ['basic_strike']` (curated pool deferred to Phase 2B per spec). Combat will work but enemy variety is poor until 2B's balance pass.
- **Tests: deleted `dice.test.ts`, `ability-buffs.test.ts`, `dice.service.test.ts`. Rewrote `combat.service.test.ts` to a small smoke covering `useConsumable` + player entry-point validation (the old 1500-line file was almost entirely dice-coupled). Added `move-resolution.test.ts` (formula bounds: crit doubling, variance window, DEF floor, level scaling).** Full move-resolution integration coverage (status side-effects, recoil math, thorns reflect, AoE 0.6x) intentionally omitted in 2A — the formula util is exercised; the orchestration is verified by manual playthrough.
- **No browser playthrough was done as part of this implementation.** Per `CLAUDE.md`, frontend visual changes (NES.css scoping, RPG fonts, move grid action bar, Reserve `+N` badge, sidebar mana indicator) must be exercised in `pnpm dev`. `pnpm lint && npx tsc --noEmit && pnpm test:run && pnpm build` all pass. Manual playthrough of the combat flow + sidebar refresh after task/habit completion still required before declaring 2A visually correct.
- **`BuffManagementService` (under `src/server/services/combat/`) deleted as a duplicate of `ability-buffs.ts`.** It wasn't referenced by anything live; left over from an earlier refactor pass.
- **Post-merge fix: stale player HP/MP caps in mid-flight quests + Phaser-grid legacy schema cleanup.** Reported as "combat shows 0/8 HP while inventory shows 40/40" for a character whose quest was started before the Phase-2A HP×5 rescale. Root cause: `tacticalState` is a snapshot taken at quest start, and the player unit's `maxHealth=8` (pre-Phase-2A literal) persisted in the JSON column with no reconciliation path. Move-resolution writes player current HP/MP back to the character row after every move, but the reverse direction (character row → tactical state) never ran, so any external bump (Phase 2A rescale, `CharacterService.revive`, future `updateProgress` on tier-up) drifts the snapshot. Three changes shipped together:
  1. **`QuestService.getTacticalState` reconciles the player unit on read.** Loads the live `currentClass`, overwrites the player unit's `maxHealth`/`maxMana`, and clamps `currentHealth`/`currentMana` into range. Enemy state untouched.
  2. **Tactical-state JSON schema trimmed of Phaser-grid legacy.** Persisted column previously carried `tiles`, `gridWidth`, `gridHeight`, `mapTemplateId`, `turnNumber`, per-unit `position`, `hasMoved`, `hasActed`, plus the `templateId: 'player'` constant. All dead since the grid was retired in Phase 2A; now stripped from `TacticalStateData` and `TacticalUnitState`. The orphaned types (`GridPosition`, `TerrainType`, `TileHighlightType`, `HighlightedTile`, `TacticalUnit`, `TileState`, `TacticalPhase`, `TacticalActionType`, `TacticalAction`, `TacticalCombatState`, `MapTemplate`, `TacticalInitData`, `MovementValidationResult`, `MovementExecutionResult`, `AttackValidationResult`, `TacticalAttackResult`, `EnemyTurnResult`, the old `TacticalAbilityResult*` / `AbilityEffectResult` / `SelfBuffAbilityResult*` triplets superseded by `TacticalMoveResult*`, and the `PLAYER_TEMPLATE_ID` constant) were removed in the same pass. `src/shared/types/combat-state.types.ts` deleted entirely — it was a never-imported parallel definition of the same shape. Net −485 lines.
  3. **`TACTICAL_STATE_VERSION` retired.** The schema-gate pattern (return null on version mismatch) is replaced with tolerant rehydration: `parseTacticalState` (zod) runs at the repository boundary inside `CharacterQuestRepository.findActiveByCharacterId` / `findByIdWithTacticalState`. Unknown legacy keys are dropped, malformed rows surface as `null`. No version field to bump on future schema changes — tolerance is the contract. The first write-back after this lands purges legacy fields from any still-live DB rows.

  Tests: new `parseTacticalState` unit suite in `src/server/__tests__/types/tactical-combat.parse.test.ts` covers legacy stripping + malformed rejection; `quest.service.test.ts` updated to verify the player-cap reconciliation against `currentClass`; `rewards.test.ts` lost its grid-position / `turnNumber` / `mapTemplateId` assertions (all dead).

- **Post-merge fix: post-spawn turn-pointer recovery + `potionUsedThisTurn` reset + DOT-kill spawn.** Reported as "defeated an enemy and the next one spawned, but it doesn't let me attack it." DB inspection of the affected quest showed `turnOrder=[player, enemy]` with `currentTurnIndex=1` — the BE state was internally consistent (enemy turn pending), but the FE never fired `executeTacticalEnemyTurn` after the player's first attack on the spawned enemy (race in `useCombat`'s `useEffect([isEnemyTurn])` vs `animations.isAnimating`). Three related issues addressed in one pass:
  1. **`CombatService.playerExecuteMove` self-heals.** Reads tactical state up front; if `state.turnOrder[state.currentTurnIndex]` resolves to a living non-player unit, runs `executeEnemyMove` for that unit first, then proceeds with the player's move. If the auto-run kills the player, short-circuits and returns the enemy result instead of executing the queued player move against a dead caster.
  2. **`potionUsedThisTurn` reset at end of enemy turn.** The flag was being set by `useConsumable` (when called via `playerUsePotion`) but never cleared by `executeMove` or `executeEnemyMove`. After one in-combat potion the BE state stayed `potionUsedThisTurn:true` indefinitely, blocking subsequent potions for the rest of the encounter. Now cleared inside `executeMove` when a non-player caster completes their turn (player's next turn begins). FE's local `setPotionUsedThisTurn(false)` is now backed by matching BE state.
  3. **DOT-kill in `executeEnemyMove` triggers `processEnemyDefeat`.** The start-of-turn DOT path (BURNING / PURIFIED / POISONED) was returning early after writing tactical state with the dead enemy still in `units`/`turnOrder`. No `combatEnemyRepository.defeatEnemy` call, no gold, no next-enemy spawn. Now mirrors the player-kill branch: filters the dead unit out of state, persists, runs `processEnemyDefeat`, surfaces `goldReward` / `nextEnemy` / `tierProgression` on the result.

  Tests: 4 new cases in `combat.service.test.ts` for the turn-pointer recovery (auto-run, lethal short-circuit, no-op when player already on pointer, no-op when pending unit is dead). New `move-resolution.integration.test.ts` covers potion-flag reset on enemy turn + preserved on player turn, and DOT-kill spawn + legacy no-spawn path when `combatEnemyRepository` is absent.

### Phase 2A — manual testing plan

Smoke checks (each: action → pass):

1. Complete task/habit/objective/journal → sidebar mana updates within ~100ms.
2. Grants past `maxMana` → `+N` Reserve badge appears; hover shows today's breakdown.
3. Start quest, kill enemy, next enemy spawns at full HP/MP; Reserve drains into mana at encounter boundary.
4. Take damage → refresh mid-fight → HP persists (not reset).
5. Move grid: equipped abilities show with mana cost; greyed when `currentMana < cost`; `basic_strike` free; damage numbers float; ~3–4 turn fights at parity tier.
6. Item flat stats (no dice notation); `mana_potion` rows scrubbed + 25g credited per row (idempotent).
7. NES.css scoped to `/quests/[id]`; `/tasks`, `/dashboard`, `/settings` unchanged.
8. Post-spawn turn-pointer recovery: kill enemy 1, attack enemy 2 without waiting for enemy-turn animation → second move auto-runs pending enemy turn, no `Not this unit's turn`.
9. Potion across enemy turns: use health potion → wait for enemy turn → potion interactable next player turn; refresh doesn't re-block.
10. DOT-kill spawn: BURNING/PURIFIED/POISONED damage ≤ remaining HP → enemy dies on its own turn → gold credited + next enemy spawns + quest progress advances.

### Sub-phase 2A — Combat Engine + Mana Cutover (atomic PR — SHIPPED)

Atomic PR collapsing server engine + client UI + mana service + items + dashboard. None of those leaves `main` shippable alone.

Surface delivered:

- **Server.** `combat-formula.ts` + `move-resolution.ts` (new); `quest.executeMove` tRPC procedure replaces `executeTacticalAttack`/`executeTacticalAbility`. `dice.ts`, `attack-resolution.ts`, `dice.service.ts` deleted. Turn order consumes `TacticalUnitState.speed`. HP×5 rescale applied to class/enemy/DOT/thorns/potion literals. `TACTICAL_STATE_VERSION` retired (replaced by tolerant `parseTacticalState` at repository boundary — see deviations).
- **Abilities.** Full translation table applied to `ABILITIES`; `basic_strike` added as universal entry (0 mana, power 35, PHYSICAL). Effect-type enum reused with new semantics (see deviations).
- **Client.** `combat-action-bar.component.tsx` renders NES.css move grid; `player-info`/`enemy-info`/`combat-arena` migrated to `nes-container`. `dice-roller.component.tsx`/`dice-result.component.tsx` deleted. `use-combat.hook.ts` drops `rollDice`/`attackRolls`/`defenseRolls`/`diceBank`; adds `useMove` + `manaReserve` + `reserveBreakdown`. `health-bar.component.tsx` relocated to `src/components/combat/`.
- **Mana economy.** `mana.service.ts`: `addManaFromCompletion` (overflow → `Character.manaReserve`), `topUpFromReserve` (at encounter start), `getTodayReserveBreakdown` (today × `MANA_REWARDS`). Grant call sites in `task`/`habit`/`objective`/`journal` services. Mutation handlers invalidate `character.get` for ~100ms sidebar refresh. AppSidebar mana indicator + `+N` badge.
- **Items.** Dice fields (`attackDice`/`physicalDefDice`/`magicDefDice`/`range`) dropped; flat bonuses (`strengthAtkBonus`/`strengthDefBonus`/`magicAtkBonus`/`magicDefBonus`) added at ×1 scaling. `speed` repurposed for turn order (`CLASS_BASE_STATS` gained `speed`). `mana_potion` entry deleted; `ManaService.scrubManaPotions` is the idempotent runtime scrub.
- **NES.css.** PostCSS prefix-selector wired in `postcss.config.mjs`; fonts (Pixelify Sans 400/600, Press Start 2P 400) loaded in existing `rpg-layout.tsx` (no `(rpg)` route group — see deviations).
- **Schema.** `Character.manaReserve Int @default(0)`, `Character.data` default `"{}"`, `CharacterClass.speed Int @default(1)`. Project uses `prisma db push`; no migration file authored.
- **Dashboard.** `diceBank` removed from response; `mana`/`maxMana`/`manaReserve` added.

### Phase 2B — what shipped (real implementation)

Recorded after landing Phase 2B. Spec text below this section is the original plan; this section is what actually merged and where it lives.

#### Enemy AI (`src/server/utils/combat/move-resolution.ts`, `executeEnemyMove`)

The spec named `src/server/utils/combat/enemy-ai.ts`; that file does not exist — enemy logic was inlined into `executeEnemyMove` during Phase 2A, so the edits landed there.

Selection algorithm now runs in this order:

1. Build the move pool from `enemy.moves[]`, falling back to `['basic_strike']` when empty.
2. Drop any move whose `manaCost > currentMana`.
3. If `currentHealth / maxHealth ≤ 0.3`, restrict the pool to damage moves (`isDamageMove`). If that empties the pool, revert to the affordable set.
4. Sort by `manaCost` descending; pick uniformly at random among the highest-cost entries.
5. If the pool resolves empty, fall back to `basic_strike`.

The literal "cheapest viable" wording in the original spec was reinterpreted as "most-expensive-affordable" (user-confirmed). Literal-cheapest would always pick `basic_strike` and defeat the curated `enemy.moves[]`. Turn order already consumed `TacticalUnitState.speed` in 2A, so no additional speed handling was needed.

#### Enemy retune (`src/shared/constants/enemies.ts`)

Every tier 1–3 enemy received a curated `moves[]` matched to archetype:

- Physical attackers (bandit_chief, fallen_templar, werewolf, werewolf_alpha, vampire, behemoth, elite_armored_templar) → `shoulder_charge` / `reckless_strike` / `kings_sword` (boss).
- Magic casters (bandit_runic, ghost, magma_demon, shadow_demon, fallen_inquisitor, shadow_demon_elite, minor_demon, elite_demon, fallen_inquisitor_boss, nephilim, fallen_angel) → `plasma_missile` / `frost_bite` / `ice_lance` / `truth_blade` / `stellar_collapse` (boss).
- Defensive elites (armored_templar) → `light_shield` + physical attacker mix.
- Mixed boss kits (demon_lord, vampire_count, belphegor_avatar) → `stellar_collapse` + plasma + a physical option.
- Pure-MINION grunts with no archetype hook (skeleton, giant_spider) → `basic_strike` only.

Mana budgets bumped to support 2–3 casts per fight (Phase 2A locked "no regen"; only Reserve top-up at encounter start). HP / atk / def / speed tuned to flatten the MINION → ELITE → BOSS ramp. Tier 4 enemies got placeholder pools using the same patterns; tier-4 balance is post-beta. **No playtest data backs the numeric tuning** — advisor flagged this; user accepted the trade. `EnemyTemplate.manaRegen` is retained on the interface (still consumed by player-stat UI in `inventory/character-status.component.tsx`) but every enemy hardcodes `manaRegen: 0`. Full field removal deferred.

#### Latent 2A bug surfaced and fixed: enemy mana never drained

`executeMove` validated `casterMana >= move.manaCost` and emitted `newMana` in the result, and wrote the deducted value to the *player's* character row, but never wrote the post-deduction value back onto `state.units[i].currentMana`. Latent in 2A because every enemy had `moves: ['basic_strike']` (cost 0); the 2B move pools are the first content that depends on enemy mana attrition.

Fix lives in the same block that decrements expired buffs (around `move-resolution.ts:367`):

```ts
const ci = findUnitIndex(state, casterId)
if (ci >= 0) {
  const decremented = dropExpiredBuffs(state.units[ci])
  const newCasterMana = Math.max(0, state.units[ci].currentMana - (stunned ? 0 : move.manaCost))
  state = {
    ...state,
    units: withUpdated(state, ci, {
      activeAbilities: decremented.activeAbilities,
      currentMana: newCasterMana
    })
  }
}
```

For the player, this is in addition to the existing character-row write — `QuestService.getTacticalState` already reconciles the player unit on read, so the in-state mana now being correct is strictly an improvement.

#### Combat log: caster tag corrected

`executeMove` was always emitting `CombatLogType.PLAYER_ATTACK` regardless of caster (pre-existing 2A bug). Invisible under the old "You attack with N dice" copy; very visible under 2B's new "You used {{ability}}!" — would mis-render as "You used Plasma Missile!" when an enemy cast it. Now gated on `isCasterPlayer`: enemy casts emit `ENEMY_ATTACKS`, which the locale already wires to "Enemy attacks!" / "¡El enemigo ataca!".

#### Locale sweep (en + es, `public/locales/{en,es}/translation.json`)

- **Catalog ability descriptions rewritten.** All 19 catalog abilities + `basic_strike` got new `description` / `name` values reflecting Pokémon-formula semantics (concrete power numbers, percent stat modifiers, recoil/crit/protect/thorns/cleanse language). Both locales updated.
- **`combat.*` block:** dropped `attack_set` / `defense_set` / `dice_to_spend` / `roll_dice*` / `no_dice` / `use_dice_roller` / `attack_rolls` (well, `attack_rolls` kept as it still appears in a stat label) / `rolling`. Added `combat.mana_reserve_badge`. `combat.log.player_attack` now reads `"You used {{ability}}!"` (en) / `"¡Usaste {{ability}}!"` (es); `combat-log.component.tsx:82` resolves the ability id → name via `abilities.${id}.name`. `combat.log.player_hits` now reads `"Critical hit!"` / `"¡Golpe crítico!"`. Hit/block count variables removed from enemy_attacks / enemy_defends / player_defends.
- **`inventory.dice_bank` → `inventory.mana_reserve`.** `inventory.stats.attack_dice` / `magic_def` / `phys_def` / `range` removed (kept `attack_bonus` / `magic_atk_bonus` / `phys_def_bonus` / `magic_def_bonus` / `damage_type` / `speed`).
- **Landing page:** `landing.combat.dice` → `landing.combat.mana` (title, body, table). New table keys: `daily_habit / high_impact_task / completed_objective / journal_entry` with concrete `+N` mana values. `landing.closing.line3` rewritten. `landing.coming_soon.features.pvp.description` dice reference dropped.
- **Tutorial:** `tutorial.dice` slide → `tutorial.mana` slide; copy describes Reserve overflow.
- **`{{diceReward}}` → `{{manaReward}}`.** Renamed in both ES strings (EN never rendered the var) and in four call sites (`task-table`, `update-task-dialog`, `habit-card`, `confirm-complete-objective-dialog`). The template variable was crossing the locale ↔ JS boundary, so the rename had to be lockstep.

Dead non-catalog ability i18n entries (`blinding_faith`, `disruption_storm`, `fireball`, `fragility_curse`, `lightning_burst`, `righteous_charge`, `templar_burst`, `temporal_prison`, `igneous_cut`, `shield_bash`) still contain "dice" copy. They are not referenced by the live `ABILITIES` catalog and never render. Spec grep gate is `src/`-scoped (line 407) and passes. Item flavor descriptions at `es/translation.json` lines 1383/1399/1427/1467 also still mention "dado" — flavor copy, not gated, deferred to a future flavor pass.

#### Source cleanup

- **Orphan combat types deleted.** `ResolveCombatParams`, `CombatTurnResult`, `DiceRollResult` removed from `src/shared/types/gamification.types.ts`; `AttackResult` removed from `src/shared/types/combat.types.ts` (the file now exports only `EncounterState`, which `rewards.ts` and `quest.service.ts` still import). No live consumers — all were dice-coupled and orphaned by Phase 2A's `executeTacticalAttack`/`executeTacticalAbility` deletion.
- **`QuestReward.dice?: number`** in `src/shared/constants/quests.ts` dropped (no consumer).
- **`AbilityEffect.sixesGenerateExtraHits?: number`** in `src/shared/types/ability.types.ts` dropped (no consumer).
- **`ability.types.ts` comments** rewritten in stat-percent terms ("dice bonus" → "% stat modifier", etc.).
- **`CombatLogType` enum left intact.** Legacy variants (`PLAYER_HITS` / `ENEMY_DEFENDS` / `PLAYER_DEFENDS` / `MANA_REGEN` / `PHASE_COMPLETE` / `STATUS_EXPIRED`) no longer have an emitter, but the UI switch arms in `combat-log.component.tsx` and `combat-arena.component.tsx` still reference them. Pruning the enum would force re-typing both consumers; deferred until the combat-log UI gets its own pass.
- **Tutorial slide** rename (`'dice'` → `'mana'`) in `tutorial-dialog.component.tsx`.
- **Landing diceTable → manaTable** in `src/app/(landing)/page.tsx`.

#### Tests

`pnpm lint && npx tsc --noEmit && pnpm test:run && pnpm build` all clean. 25 suites / 296 tests (3 new cases in `move-resolution.integration.test.ts`):

- Enemy mana decrements on the tactical unit after a single cast (`plasma_missile`: 6 → 3).
- Across-turn fallback: 3 mana → `plasma_missile` → 0 → `basic_strike` on the next turn.
- Enemy-cast logs `ENEMY_ATTACKS`, not `PLAYER_ATTACK`.

AI selection (cost-tier sort + HP-low filter) is not yet covered by a focused test — the new cases assert the *outcomes*, not the ordering. Cheap to add; deferred.

#### Files touched

- `src/server/utils/combat/move-resolution.ts` — AI selection rewrite, caster mana drain, caster log tag.
- `src/shared/constants/enemies.ts` — full retune + curated `moves[]`.
- `public/locales/en/translation.json`, `public/locales/es/translation.json` — locale sweep.
- `src/app/(landing)/page.tsx` — dice table → mana table.
- `src/components/tutorial/tutorial-dialog.component.tsx` — slide rename.
- `src/components/combat/combat-log.component.tsx` — `player_attack` ability-name resolve, hit/block variables dropped.
- `src/app/(workspace)/tasks/_components/{task-table,update-task-dialog}.component.tsx`, `habits/_components/habit-card.component.tsx`, `objectives/_components/confirm-complete-objective-dialog.component.tsx` — `diceReward` → `manaReward`.
- `src/shared/types/{ability,combat,gamification}.types.ts` — orphan type cleanup, comments.
- `src/shared/constants/quests.ts` — drop `QuestReward.dice`.
- `src/server/__tests__/utils/combat/move-resolution.integration.test.ts` — 3 new cases.

### Phase 2B — manual testing plan

Tests cover shape; retune + locale + mana drain need eyes.

**Enemy AI + mana drain:**

1. `bandit_runic`/`shadow_demon` first turn casts `frost_bite`/`plasma_missile`, not `basic_strike`.
2. Multi-cast enemy (`shadow_demon` 6 mana) drains across 2 casts → turn 3 = `basic_strike`. Refresh persists MP=0.
3. `armored_templar` ≤ 30% HP stops buffing, swaps to damage moves.
4. `demon_lord` first turn = `stellar_collapse` (10 mana, ~110 power); subsequent turns drop tier once mana < 10.
5. `skeleton`/`giant_spider` (mana 0): every turn `basic_strike`, MP bar hidden.

**Combat log copy:**

6. Player cast: "You used Truth Blade!" / "¡Usaste Filo de la Verdad!" — not raw id, not "attack with N dice".
7. Enemy cast: "Enemy attacks!" / "¡El enemigo ataca!" — *not* "You used Plasma Missile!".
8. Crit: "Critical hit!" / "¡Golpe crítico!" with CRIT badge.

**Ability tooltips:** mana-flavored ("50 magic damage", "+50% Attack 2 turns", "Block all damage 1 turn", "Reflect 10"). `basic_strike` tooltip = "A standard physical attack. Costs no mana." ES lockstep — no `dados`/`Heridas`/`Umbral` in 19 catalog entries.

**Inventory + landing + tutorial:** `inventory.dice_bank` → "Mana Reserve". Item stats show `Attack/Magic Atk/Phys Def/Magic Def/Damage Type/Speed` (no `Attack Dice`/`Range`). Landing page "Mana Economy" + `+N` table; closing line3 mana, not dice. Tutorial first slide = "Earn Mana / Gana Maná" (Gamepad icon).

**Reward toasts:** ES locale shows `{{manaReward}}` resolved; EN renders without appended reward (template token absent — by design).

**Regression smoke:**

- 10 T1 parity fights average 3–5 turns. Outside range → flag which tier and which stat axis (`strengthAtk`/`magicAtk`/`health`/`speed`).
- T2/T3 parity = 3–5 turns; below-tier faster but not one-shot.
- DOT-kill spawn still works (2A regression check).
- Grep gate: `grep -ri 'dice' src/ --exclude-dir=__tests__` no production matches; same for `attackRolls|defenseRolls|diceBank`.

**Known holes:** no empirical balance data — only fight-count tests. Non-catalog ability i18n entries still say "dice" (no live consumer; deferred).

### Sub-phase 2C — NES.css migration for remaining RPG views

After combat is on NES.css (in 2A), migrate the rest of the RPG-views set. `/map` is **not** in this list — it's deleted.

- **Inventory:** `src/app/(workspace)/inventory/_components/*` — item grid, item detail dialog, kill-record list, equip/unequip controls. Item-stats display uses `nes-list is-disc` or similar.
- **Shop:** `src/app/(workspace)/shop/*` — purchase grid, item detail. Reuse the loadout/inventory styling.
- **Guilds:** `src/app/(workspace)/guilds/*` — clan UI gets the RPG visual treatment for coherent system identity.
- **Quest screens:** `src/app/(workspace)/quests/[questId]/page.tsx` shell + any sibling quest UI components outside the combat arena.
- **Character / class screens (within inventory):** wherever class stats, tier badges, ability loadout are shown. Loadout grid uses NES.css containers; ability slots reuse the combat ability button styling.

Each migrated screen is wrapped under the `(rpg)` route group; `.rpg-ui` class applied at the layout segment. Verify by toggling between `/tasks` (Tailwind) and `/quests/[id]` (NES.css) — visual styles remain isolated.

Delete `panelChrome` export once all consumers are migrated (`src/components/combat/combat-styles.ts`).

**Delete `/map`:** remove `src/app/(workspace)/map/` directory entirely. Remove `/map` references from navigation, route allowlists, and `RPG_ROUTES` in the workspace layout. Confirm no dead imports remain.

### Phase 2 risks

- **Item stat translation may unbalance loadouts.** Mitigated by the ×1 scaling against HP×5 calibration, but verify in playthrough: T1 fights should average 3–4 turns at parity tier.
- **Speed-based turn order is new mechanics scope.** Existing tactical state has the field but no engine logic consumes it today. Tests for tie-breaking and consistent ordering must land in 2A.
- **No e2e tests** for combat — confirmed via glob. Manual playthrough required at end of 2A and 2B.
- **Dashboard widget removal** may leave layout holes — verify visual.
- **NES.css scope leak.** Mitigated by PostCSS prefix-selector at build time. Test by visiting `/tasks`/`/dashboard` after 2A merges (combat is on NES.css then).
- **Press Start 2P readability.** Cramped at small sizes — confined to display-only headings (24px+). Body text uses Pixelify Sans which renders cleanly at 12–14px.
- **NES.css custom container shadows** clash with current `panelChrome` shadow if both render. Migrate atomically per screen.
- **`mana_potion` scrub migration** runs once on deploy. Audit log the count and the gold credited; failure to run = users keep an unusable item in inventory.
- **TACTICAL_STATE_VERSION double bump** means any user who hasn't completed Phase 1's quest before Phase 2A ships loses Encounter progress (state invalidated). Acceptable for beta; document in release notes.

---

## Phase 3 — Deferred (not in this plan)

"Doesn't feel gamy" is a separate effort: animation polish, sound design, more lore/world touchpoints, character progression visibility outside combat, retro/16-bit aesthetic consistency per the design doc. A Herald-flavored heal Ability (deferred from beta) would land here if users request it. Tracked here as acknowledgement, not scope.

---

## Critical files

### Phase 1

- `src/hooks/use-combat.hook.ts` (sprite + MP fixes, sync templateId)
- `src/components/combat/player-info.component.tsx` (NaN guard)
- `src/components/combat/enemy-info.component.tsx` (add MP bar)
- `src/shared/types/gamification.types.ts` (`EnemyState` + mana fields)
- `src/shared/types/tactical-combat.types.ts` (`TACTICAL_STATE_VERSION` 2→3, mana fields)
- `prisma/schema.prisma` (`User.dateFormat`)
- `src/utils/format-date.util.ts` (NEW)
- `src/hooks/use-format-date.hook.ts` (NEW)
- `src/app/(workspace)/settings/page.tsx` (settings control)
- `public/locales/en/translation.json` + `public/locales/es/translation.json`
- ~12 date-rendering call sites listed above

### Phase 2A — Combat Engine + Mana Cutover (atomic PR)

- `src/server/utils/combat/move-resolution.ts` (NEW)
- `src/server/utils/combat/combat-formula.ts` (NEW)
- `src/server/utils/combat/attack-resolution.ts` (DELETE)
- `src/server/utils/combat/dice.ts` (DELETE)
- `src/server/utils/combat/ability-buffs.ts` (drop dice-coupled buff fields)
- `src/shared/constants/abilities.ts` (full translation table + `basic_strike`)
- `src/shared/constants/enemies.ts` (add `moves: string[]`; HP×5 rescale)
- `src/shared/constants/classes.ts` (HP×5 on `baseHealth`; new `speed` base stat)
- `src/shared/types/ability.types.ts` (`AbilityDefinition` extension)
- `src/server/routers/quest.router.ts` (`executeMove` procedure; delete legacy)
- `src/components/combat/combat-action-bar.component.tsx` (move grid)
- `src/components/combat/player-info.component.tsx` (NES.css + reserve badge + tooltip)
- `src/components/combat/enemy-info.component.tsx` (NES.css)
- `src/components/combat/combat-arena.component.tsx` (NES.css frame)
- `src/components/combat/health-bar.component.tsx` (MOVED from `map/_components/`)
- `src/hooks/use-combat.hook.ts` (drop dice; add useMove + manaReserve)
- `src/components/combat/dice-roller.component.tsx` (DELETE)
- `src/components/combat/dice-result.component.tsx` (DELETE)
- `src/app/(workspace)/quests/[questId]/page.tsx` (drop diceBank)
- `src/app/(workspace)/(rpg)/layout.tsx` (NEW — NES.css import, fonts, `.rpg-ui` wrapper)
- `src/app/(workspace)/layout.tsx` (route-group rewire)
- `src/styles/nes-overrides.css` (NEW)
- `postcss.config.js` (add `postcss-prefix-selector` rewriting NES.css selectors)
- `package.json` (add `nes.css`, `postcss-prefix-selector`)
- `src/server/services/mana.service.ts` (NEW)
- `src/server/services/dice.service.ts` (DELETE)
- `src/server/services/service.factory.ts` (register `mana.service`)
- `src/shared/constants/rewards.ts` (NEW — `MANA_REWARDS`)
- `src/server/services/task.service.ts` (replace grant)
- `src/server/services/habit.service.ts` (replace grant)
- `src/server/services/objective.service.ts` (replace grant)
- `src/server/services/journal.service.ts` (replace grant)
- `src/server/utils/character.utils.ts` (drop `extractDiceBank`)
- `src/server/services/dashboard.service.ts` (replace diceBank with mana)
- `src/shared/constants/items.ts` (dice→flat, drop range, drop `mana_potion`, HP×5 on `health_potion`)
- `src/components/common/item-stats-display.component.tsx` (flat stats)
- `src/components/common/app-sidebar.component.tsx` (out-of-combat mana indicator)
- `prisma/schema.prisma` (add `Character.manaReserve`; `Character.data` default `"{}"`)
- `prisma/migrations/` (NEW migration: column + data scrub for `mana_potion`)
- `src/server/services/quest.service.ts` (`topUpFromReserve` at Encounter start)

### Phase 2B — AI/balance/i18n

- `src/server/utils/combat/enemy-ai.ts` (move selection; HP×5 already done in 2A but DOT damage uses literal-scaled values)
- `src/shared/constants/enemies.ts` (balance pass on tier 1–3)
- `public/locales/en/translation.json` + `public/locales/es/translation.json` (full dice → mana sweep + Abilities → Abilities)

### Phase 2C — NES.css migration for remaining RPG views

- `src/app/(workspace)/inventory/_components/*` (NES.css)
- `src/app/(workspace)/shop/*` (NES.css)
- `src/app/(workspace)/guilds/*` (NES.css)
- `src/app/(workspace)/quests/[questId]/page.tsx` + sibling quest UI
- `src/app/(workspace)/map/` (DELETE entire directory)
- `src/components/combat/combat-styles.ts` (DELETE `panelChrome` once unused)

### Reuse (do not reinvent)

- Status effect engine: `src/shared/types/ability.types.ts` (`StatusEffect`, `ActiveStatusEffect`)
- Defeat handling: `src/server/utils/combat/rewards.ts` (`processEnemyDefeat`)
- Animations: `src/hooks/use-combat-animations.hook.ts` (damage numbers, attack/heal/death)
- HP bar: `src/components/combat/health-bar.component.tsx` (relocated in 2A from `map/_components/`)
- Combat log enum: `CombatLogType` in `src/shared/types/gamification.types.ts`

---

## Verification

### Phase 1

1. **Branch off `main`** (do NOT stack on `feat/guilds`).
2. Sprite bug: enter combat 5× from a fresh page load. Sprite renders every time. Force a 404 by temporarily renaming `/public/assets/enemies/<X>.png`; confirm fallback chain still kicks in for genuinely missing templates.
3. MP bar: trigger a state where `maxMana = 0` (mock or new low-tier class). Bar hidden / empty, no NaN.
4. Enemy MP bar: visible on existing enemies (0/0 until Phase 2 hydrates them); hidden when `maxMana === 0`.
5. Date format: change setting → reload → verify `task-table` and `objective-card` reflect new format. Run `pnpm lint && npx tsc --noEmit && pnpm test:run`.
6. i18n: switch `es` locale, confirm new strings render.

### Phase 2A (atomic)

- Server unit tests (`move-resolution.test.ts`) green; manual combat playthrough — moves resolve, damage shown, no dice anywhere on screen.
- Move grid appears; greyed when mana low; `basic_strike` free; mana drops on use; damage numbers display; crits show CRIT badge. Pixelify Sans renders for ability names + HP/MP labels; Press Start 2P only on screen titles.
- Complete a task / habit / objective / journal → mana indicator on sidebar updates within ~100ms. Surplus past `maxMana` accumulates in `Character.manaReserve`; `+N` badge appears. Hover badge → tooltip lists today's grants by source.
- Spend mana in a fight → win → next Encounter top-up drains Reserve back into mana. Dashboard shows mana, not dice. Item tooltips show flat stats. Equip an item → character class stats change. Faster wielder acts first; equal speed → tie order varies across runs.
- UI reads "Abilities" everywhere "Abilities" used to appear in user-facing copy.
- Verify `mana_potion` migration: count and gold refund logged; no character has a `mana_potion` entry post-deploy.
- HP×5 verification: T1 fights last 3–4 turns at parity tier; one-shot scenarios are rare (crits only).
- Visit `/tasks`/`/dashboard` — Tailwind style intact, no NES.css leak.

### Phase 2B

- Enemy uses moves; MP bar drops on use; enemy AI doesn't lock on a too-expensive move.
- Final grep `grep -ri 'dice' src/ --exclude-dir=__tests__` shows no production matches.
- Balance: average T1 fight duration logged across 10 playthroughs falls in 3–5 turn range.

### Phase 2C

- Visit each migrated RPG view (`/inventory`, `/shop`, `/guilds`, `/quests/[id]` + list) — NES.css renders, fonts apply.
- Visit each productivity view (`/tasks`, `/habits`, `/dashboard`, `/settings`, `/journaling`, `/objectives`, `/calendar`) — Tailwind style intact, original font intact, no NES.css leak.
- Verify HP/MP labels readable on mobile widths.
- Confirm `/map` returns a 404 (route deleted, no fallback page).

### Branch hygiene

- Phase 1 PR branches off `main`, not `feat/guilds`.
- Phase 2A is one atomic PR (former 2a + 2b + 2c). `main` becomes the post-rewrite combat once 2A merges.
- Phase 2B and 2C are independent PRs after 2A.
