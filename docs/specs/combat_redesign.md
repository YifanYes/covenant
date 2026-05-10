# Combat Redesign — Implementation Spec

## Context

A user tested the app and gave feedback covering bugs, design pivots, and one feature request. Decided scope:

1. Player/enemy sprite + MP bar render bugs (small)
2. Add date format setting (small, ~12 call sites)
3. Add enemy MP bar (feature; surfaces enemy mana for new combat)
4. Replace dice combat with Pokémon-style combat (large) — **full cutover, no coexistence with old system**
5. **Mana regen from real-life completions** — finishing tasks/habits/objectives/journals grants character mana, replacing the old dice-bank meta-progression sink
6. **Migrate RPG views to NES.css** — combat, map, inventory, character/class, quest screens

### Important caveats

- **The tester may not be the target user.** The product's stated target is Risk/Warhammer-literate engineers/optimisers. The tester's "dice are confusing" feedback runs against that audience, while their dashboard/optimiser feedback was positive. The Pokémon rewrite is a multi-week bet committed with eyes open.
- **"Doesn't feel gamy" is not a dice problem.** It's animations / sound / lore / juice / world-building. Replacing dice will not fix the vibe complaint. That work is a separate Phase 3 (deferred — not in this plan).
- **Phase 1 ships independently in days.** Bugs + date format do not depend on combat redesign. Branch off `main`, not the current `feat/guilds` branch.
- **"Enemy MP bar" the tester reported is ambiguous.** Enemies have no MP bar in code today. The user's answer treats this as a feature request (correct fit for Pokémon-style combat where enemies use moves). Phase 1 still fixes the *player* MP NaN bug regardless.

### Locked decisions

- **Mana reward table** (Mid baseline; tunable post-launch):
  - Habit complete: +2 mana
  - Task complete: +1 (low impact) / +3 (mid) / +5 (high)
  - Objective complete: +10 mana
  - Journal entry: +1 mana
- **Reserve bank.** Surplus mana from completions overflows into `Character.manaReserve` (uncapped, separate from combat `mana`). Reserve **refills active mana to `maxMana` at the start of each combat encounter** (not mid-fight). Single fight still has a finite mana budget = `maxMana`, but a productive day stocks enough reserve for many fights in a row.
- **Basic-attack power: 35** (Pokémon Tackle tier). Encourages spending paid moves; basic attack viable as a fallback when out of mana.
- **UI naming: "Abilities"** (was "Doctrines" in copy). Code identifiers (`DOCTRINES`, `doctrine.types.ts`, etc.) stay unchanged — UI/i18n strings only. Internal symbols can be renamed later if desired.
- **RPG UI library: NES.css** for all RPG views (combat + map + inventory + character/class + quests). Productivity views (tasks, habits, dashboard, settings, journaling, guilds, objectives, calendar) keep current Tailwind style. Reasoning: matches Pokémon-style combat aesthetic, extends existing 8-bit pixel language (`pixelarticons`, `panelChrome` shadow), pure CSS utility classes for clean Tailwind interop, ~2.5kb gzip.
- **Fonts (RPG views only):**
  - **Pixelify Sans** — body text: ability names, HP/MP labels, numbers, button text. 4 weights (400/500/600/700) for hierarchy. Loaded via `next/font/google`.
  - **Press Start 2P** — display only: screen titles ("Battle"/"Victory"/"Defeat"), encounter banners, hero numerals at 24px+. Loaded via `next/font/google` (weight: 400).
  - Reasoning: NES.css's default Press Start 2P is unreadable below 16px (cramped, blocky). Pixelify Sans renders cleanly at 12–14px and has bold weights for damage numbers / mana costs. Press Start 2P confined to display sizes preserves authentic NES nostalgia where readability is not at risk. Both support Latin charset for en + es.
  - Productivity views keep the current font stack untouched.

---

## Phase 1 — Bugs + Date Format + Enemy MP Bar

Single PR, branched off `main`. Ships in days.

### 1A. Sprite render bug

**Root cause:** `src/hooks/use-combat.hook.ts:73` syncs enemies from `tacticalState` and falls back to `''` for `templateId` when the local cache misses. Empty string → `getEnemy('')` returns undef → sprite falls back to `/assets/enemies/default.png` → 404 → `onError` hides image.

**Fix:** Server-side `TacticalUnitState.templateId` already exists (`src/shared/types/tactical-combat.types.ts:40`). Read it directly from the unit; drop the `existing?.templateId ?? ''` cache trick.

```ts
// src/hooks/use-combat.hook.ts:65-79 — replace map body
return {
  id: u.id,
  templateId: u.templateId, // server-authoritative
  currentHealth: u.currentHealth,
  maxHealth: u.maxHealth,
  currentMana: u.currentMana ?? 0,    // Phase 1C addition
  maxMana: u.maxMana ?? 0,
  namePrefix: existing?.namePrefix ?? nameParts[0],
  nameSuffix: existing?.nameSuffix ?? nameParts[1]
}
```

`EnemyState` in `src/shared/types/gamification.types.ts:68` already has `templateId`.

### 1B. Player MP bar NaN

**Root cause:** `src/components/combat/player-info.component.tsx:31` — `(mana / maxMana) * 100` = `NaN` when `maxMana=0` or undef. NaN width = invisible bar. Also `use-combat.hook.ts:501` returns `currentClass.mana` directly, not from tactical state — stale during init.

**Fix:**
- Guard at `player-info.component.tsx:31`: `const manaPercentage = maxMana > 0 ? Math.max(0, Math.min(100, (mana / maxMana) * 100)) : 0`.
- Sync `playerMana`/`playerMaxMana` from `playerUnit` (tactical state) like `playerHealth` does at lines 42-44, falling back to `currentClass.mana`/`maxMana`.

### 1C. Enemy MP bar (feature)

Needed for Phase 2. Add now so Phase 1 ships the visual + Phase 2 fills semantics.

- Extend `EnemyState` (`src/shared/types/gamification.types.ts:68`) with `currentMana: number` and `maxMana: number`.
- Extend `TacticalUnitState` (`src/shared/types/tactical-combat.types.ts` ~line 40) with `currentMana`/`maxMana` if missing. Hydrate at combat init from `EnemyTemplate.mana` in `src/shared/constants/enemies.ts`.
- Bump `TACTICAL_STATE_VERSION` 2 → 3 to invalidate stale persisted state.
- `src/components/combat/enemy-info.component.tsx`: stack MP bar under HP bar. Reuse JSX pattern from `player-info.component.tsx:47-59`. Hide bar when `maxMana === 0`.

### 1D. Date format setting

**Storage:** `User.locale` is already DB-backed (`prisma/schema.prisma:18`). `dateFormat` is the same shape — regional preference, follows the user across devices. Use a DB column matching the `locale` pattern, not Zustand.

**Schema:**
```prisma
// prisma/schema.prisma — User model
dateFormat String @default("locale") // "locale" | "iso" | "us" | "eu"
```

**Format options:**
- `locale` — dayjs `'L'` (current default — locale-derived: en-US → MM/DD/YYYY, es → DD/MM/YYYY)
- `iso` — `YYYY-MM-DD`
- `us` — `MM/DD/YYYY`
- `eu` — `DD/MM/YYYY`

**Util + hook:**
- New `src/utils/format-date.util.ts` exporting `formatDate(date, preference, fallback?)`. Maps preference → dayjs format string.
- New `src/hooks/use-format-date.hook.ts`. Reads user preference; returns memoized `(date) => string`.

**Call sites to migrate (~12, grep `format\('L'\)` and `toLocaleDateString`):**
- `src/app/(workspace)/tasks/_components/task-table.component.tsx:90`
- `src/app/(workspace)/objectives/_components/objective-card.component.tsx:97`
- `src/app/(workspace)/dashboard/_components/upcoming-tasks/upcoming-task-card.component.tsx:21`
- `src/app/(workspace)/habits/_components/habit-card.component.tsx:51,57`
- `src/app/(workspace)/journaling/_components/mood-calendar.component.tsx`
- `src/app/(workspace)/guilds/_components/member-list.component.tsx`
- `src/app/(workspace)/calendar/_components/day-details-dialog.component.tsx`
- Plus remaining call sites — grep for both patterns.

Leave `'DD MMM'` and `'MMMM YYYY'` formatters alone (intentional non-date-only displays).

**Settings UI:** add `SingleSelect` to `src/app/(workspace)/settings/page.tsx` between "Language" (139-147) and "Default tasks view" (148-159). New tRPC mutation `userPreferences.updateDateFormat` (or extend an existing user mutation).

**i18n:** add `settings.date_format_label`, `settings.date_format_placeholder`, `settings.date_format.{locale,iso,us,eu}` to `public/locales/en/translation.json` and `public/locales/es/translation.json` in the existing `settings` block (~line 1697).

### Phase 1 deliverables

- 1× Prisma migration: `User.dateFormat` column.
- 0 schema changes for combat (`TACTICAL_STATE_VERSION` bump only).
- ~6 modified files for bugs + MP bar.
- ~14 modified files for date format.

---

## Phase 2 — Pokémon-style Combat Rewrite (full cutover)

**No feature flag. No coexistence.** Old dice system removed in this phase. Sub-phases below are sequential PRs that each leave `main` shippable, but the legacy path is gone after 2a — not gated behind a flag.

### Mechanics spec (locked)

- **Damage formula** (Gen-1-ish):
  ```
  level    = currentClass.tier * 10 + 10  // tier 1 → L20, tier 2 → L30
  variance = 0.85 + Math.random() * 0.30  // ±15%
  isCrit   = Math.random() < 1/16          // 6.25%, 2× damage
  damage   = floor((((2*L/5 + 2) * power * atk/def) / 50) + 2) * variance * (isCrit ? 2 : 1)
  ```
- `atk = strengthAtk` or `magicAtk` per move (move declares `damageType`).
- `def` = matching enemy stat. Floor at 1 to avoid div-by-zero.
- **Move cost:** shared mana pool. Each move declares `manaCost`. Basic attack costs 0.
- **Defence:** enemy's DEF stat handles incoming damage in the formula. "Protect" becomes an opt-in move (full block one turn).
- **Recoil:** opt-in per move (`recoilPercent`), not random self-damage from rolling 1s.
- **Crits:** 2× damage on a 1/16 roll. `criticalHits` field on `CombatEnemy` survives unchanged.

### Mana economy (replaces dice bank)

**Real-life completion → in-game mana grant.** The character's `mana` is the resource that gates combat actions. Run out → can't keep fighting → go finish real-world tasks.

**Reward values** (locked, see Locked Decisions):

| Source | Mana |
|---|---|
| Habit complete | +2 |
| Task complete (low impact) | +1 |
| Task complete (mid impact) | +3 |
| Task complete (high impact) | +5 |
| Objective complete | +10 |
| Journal entry | +1 |

**Reserve bank mechanic:**
- Active mana lives on `CharacterClass.mana` (existing, capped at `maxMana`). Surplus overflows into a new `Character.manaReserve` Int column (uncapped).
- Grant flow: `addManaFromCompletion(userId, source, context)` adds to `mana` first; if `mana > maxMana`, the excess goes to `manaReserve` and `mana` clamps at `maxMana`.
- **Reserve consumes at combat start, not mid-fight.** When a quest's combat phase begins (`quest.service.ts` combat init / next-encounter spawn), top up `mana` from `manaReserve` to fill to `maxMana`. Drain reserve by the topped-up amount.
- Player MP bar in `player-info.component.tsx` gains a small **reserve indicator** (numeric badge "+N" next to mana count) so the player can see hoarded surplus.

**Grant call sites** (replaces existing `addDiceToBank`):
- Task: `src/server/services/task.service.ts:82` — impact-scaled (1/3/5 per locked table).
- Habit: `src/server/services/habit.service.ts:75` — flat +2.
- Objective: `src/server/services/objective.service.ts:28` — flat +10 (currently 6 dice).
- Journal: `src/server/services/journal.service.ts:34` — flat +1.

### Schema impact: minimal

- 1 Prisma migration: add `Character.manaReserve Int @default(0)` (reserve bank column).
- Drop `data.diceBank` from `Character.data` JSON default — `prisma/schema.prisma:86` `@default("{\"diceBank\": 0}")` → `@default("{}")`. Existing rows' `data.diceBank` becomes ignored on read.
- Extend `TacticalUnitState` with `currentMana`/`maxMana` (already done in Phase 1C).
- Extend `DoctrineDefinition` (`src/shared/types/doctrine.types.ts`) with optional `power?: number`, `damageType?: 'PHYSICAL' | 'MAGIC'`, `recoilPercent?: number`.
- `EnemyTemplate.moves: string[]` — code-only field in `src/shared/constants/enemies.ts`. Plus `EnemyTemplate.mana` (already exists, hydrate it).
- **Items schema:** drop dice fields entirely (`attackDice`, `physicalDefDice`, `magicDefDice`) from `src/shared/constants/items.ts`. Replace with flat stat bonuses (`strengthAtkBonus`, `strengthDefBonus`, `magicAtkBonus`, `magicDefBonus`). Update consumers — see Phase 2c.

### Sub-phase 2a — Server engine cutover

- New `src/server/utils/combat/combat-formula.ts` — pure damage calc.
- New `src/server/utils/combat/move-resolution.ts` — resolves a move (damage path → formula; side-effect path → existing tactical-doctrine dispatcher).
- New tRPC procedure `quest.executeMove(questId, moveId, casterId, targetIds)` in `src/server/routers/quest.router.ts`. **Replaces** `executeTacticalAttack` and `executeTacticalDoctrine` — those are deleted in this PR.
- Add `basic_strike` to `DOCTRINES` catalog (power 35, physical, 0 mana).
- Delete `src/server/utils/combat/dice.ts` and `src/server/utils/combat/attack-resolution.ts`.
- Delete dice-coupled fields on `BuffManagementService.getActiveDoctrineBuffs`: `bonusDice`, `thresholdMod`, `guaranteedCritical`, `criticalThresholdMod`, `sixesGenerateExtraHits`, `onesHurtSelf`.
- Add `power`/`damageType`/`recoilPercent` to entries in `src/shared/constants/doctrines.ts` per translation table:

| Old effect | New |
|---|---|
| `POWER_MODIFIER` (self) | `STAT_BUFF` (+ATK% N turns) |
| `THRESHOLD_MODIFIER` | drop |
| `GUARANTEED_CRITICAL` | `+critChance` buff |
| `NEGATE_HITS=99` (iron_bastion) | "Protect" — full block one turn |
| `NEGATE_HITS<50` | % damage reduction buff |
| `APPLY_STATUS`/`HEAL`/`DIRECT_DAMAGE`/`thornsDamage`/`scalesWithEnemyTier` | keep (engine reused) |
| `defenseZero`/`onesHurtSelf` | replaced by `recoilPercent` on specific moves |
| `sixesGenerateExtraHits` | drop |

- Tests: new `src/server/__tests__/utils/combat/move-resolution.test.ts` covers variance bounds (±15%), crit rate (1/16), recoil math, defender DEF floor at 1, status side-effects firing, basic_strike with 0 mana. Delete `dice.test.ts` and rewrite `attack-resolution.test.ts` → `move-resolution.test.ts`.

### Sub-phase 2b — Client UI rewire (combat + NES.css setup)

**NES.css setup** (one-time, shared with 2e):
- `npm i nes.css`. Import base stylesheet in a dedicated RPG-views layout segment so it doesn't leak into productivity views.
- **Fonts** (locked, see Locked Decisions):

  ```ts
  // src/app/(workspace)/(rpg)/layout.tsx (or shared font module)
  import { Pixelify_Sans, Press_Start_2P } from 'next/font/google'

  const pixelifySans = Pixelify_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-rpg-body'
  })

  const pressStart = Press_Start_2P({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-rpg-display'
  })

  // Apply both vars on the .rpg-ui scope wrapper.
  // CSS: override NES.css default font via CSS custom property.
  // .rpg-ui { font-family: var(--font-rpg-body); }
  // .rpg-ui h1, .rpg-ui .rpg-title { font-family: var(--font-rpg-display); font-size: clamp(24px, 4vw, 48px); }
  ```

- Color token mapping: NES.css defaults (`is-primary`/`success`/`warning`/`error`) need to align with existing Tailwind faction theme tokens. Either override CSS vars on the RPG-views container or use NES.css base classes plus Tailwind utility overrides (`nes-progress is-success` + `[&]:bg-emerald-500`).
- Scope leak prevention: wrap RPG views in a `.rpg-ui` class on a parent layout. Apply NES.css selectors only inside that scope (fork the stylesheet or use `@scope` if browser support OK; simpler: scoped CSS via PostCSS prefix).

**Combat UI** (uses NES.css from setup above):
- Rewrite `src/components/combat/combat-action-bar.component.tsx`: drop `DiceRoller`/`DiceResult`; render NES.css `nes-container` with 4-slot ability grid (name + mana cost; `nes-btn is-disabled` when `currentMana < cost`). Fold `doctrine` view into one menu.
- `src/components/combat/player-info.component.tsx` / `enemy-info.component.tsx`: replace `panelChrome` with `nes-container is-rounded`; HP/MP bars use `nes-progress is-success` / `is-primary`. Reserve `+N` badge styled as `nes-badge`.
- `src/components/combat/combat-arena.component.tsx`: NES.css `nes-container` for the arena frame. Sprites stay as-is.
- `src/hooks/use-combat.hook.ts`: drop `rollDice`/`attackRolls`/`defenseRolls`/`diceBank` props; add `useMove(moveId, targetIds)`. Damage numbers stay; server returns `wasCritical: boolean`. Drop `diceBank` from `useCombat()` signature.
- Delete `src/components/combat/dice-roller.component.tsx` and `dice-result.component.tsx`.
- `src/app/(workspace)/quests/[questId]/page.tsx`: drop `diceBank` prop pass-through.
- `src/components/combat/combat-styles.ts`: deprecate `panelChrome` for combat (replaced by `nes-container`); keep export for now if non-combat callers exist.

### Sub-phase 2c — Mana economy + items + dashboard

**Mana service replaces dice service:**
- New `src/server/services/mana.service.ts`. Methods:
  - `addManaFromCompletion(userId, source: 'task' | 'habit' | 'objective' | 'journal', context?)` — grant resolver. Adds to `CharacterClass.mana` first; overflow above `maxMana` pushes into `Character.manaReserve` (uncapped).
  - `topUpFromReserve(characterId)` — called at combat-encounter start. Drains reserve into `mana` until `mana = maxMana` or reserve is 0.
- New `src/shared/constants/rewards.ts` exporting `MANA_REWARDS` (replaces `DICE_REWARDS`). Values from locked table.
- Replace call sites:
  - `src/server/services/task.service.ts:82` — `addDiceToBank` → `addManaFromCompletion(userId, 'task', { impact })`.
  - `src/server/services/habit.service.ts:75` — `addManaFromCompletion(userId, 'habit')`.
  - `src/server/services/objective.service.ts:28` — `addManaFromCompletion(userId, 'objective')`.
  - `src/server/services/journal.service.ts:34` — `addManaFromCompletion(userId, 'journal')`.
- Combat init: in the encounter-start path (`src/server/services/quest.service.ts` — wherever `tacticalState.units` is created/refreshed for a new fight), call `topUpFromReserve` so the player enters each fight at full mana while reserve has stock.
- Delete `src/server/services/dice.service.ts`.
- `src/server/utils/character.utils.ts`: drop `extractDiceBank`; replace `diceBank` field in `getCharacterProgress()` return with `manaReserve` (or remove if not consumed by callers).
- `prisma/schema.prisma`: add `Character.manaReserve Int @default(0)`. Change `Character.data` default `"{\"diceBank\": 0}"` → `"{}"`. One migration.

**Reserve UI:**
- `src/components/combat/player-info.component.tsx`: render a small `+N` reserve badge next to the `{mana}/{maxMana}` count when `manaReserve > 0`. Reuse existing typography; no new component.
- `useCombat()` exposes `manaReserve` from server (extend `playerUnit` shape or piggyback on `currentClass`).

**Items: drop dice stats entirely:**
- `src/shared/constants/items.ts`: remove `attackDice`/`physicalDefDice`/`magicDefDice`; add `strengthAtkBonus`/`strengthDefBonus`/`magicAtkBonus`/`magicDefBonus` (flat ints).
- `src/components/common/item-stats-display.component.tsx`: render flat stats.
- Item stat application path (loadout → character class stats): grep for any place items modify `strengthAtk`/`magicAtk` etc. and update.
- `src/app/(workspace)/map/_components/enemy-card.component.tsx`: drop "ATK: 2d / DEF: 1d" string; show flat ATK/DEF.

**Dashboard:**
- `src/server/services/dashboard.service.ts:249-263`: drop `diceBank` from response shape; add `mana`/`maxMana` if not already present.
- Dashboard UI: replace any "Dice Bank" widget with mana display, or remove the widget entirely if redundant with player MP bar.

### Sub-phase 2d — Enemy AI + balance + i18n cleanup

- `src/server/utils/combat/enemy-ai.ts`: pick cheapest viable move that fits current mana; prefer attack if HP low and Heal available.
- Balance pass: tier 1–4 enemy templates' `moves`, mana pool, ATK/DEF/HP values in `src/shared/constants/enemies.ts`. Manual tuning + log play sessions.
- Locale strings — full sweep, en/es lockstep. Strategy: keep i18n keys, change values only (less code churn):
  - `combat.log.player_attack` ("You attack with {{dice}} dice" → "You used {{ability}}!")
  - `combat.log.player_hits` → "Critical hit!" / damage line
  - `inventory.dice_bank` → repurpose as `mana_reserve` (or remove if reserve UI doesn't need a label)
  - `inventory.stats.attack_dice` / `phys_def_dice` / `magic_def_dice` → flat-stat copy
  - **"Doctrines" → "Abilities"** — every UI-facing string. Keys may keep `doctrine` token to avoid file-wide rename; values change. Sweep: `grep -ri 'octrine' public/locales/`.
  - Add `combat.mana_reserve_badge` for the `+N` reserve indicator on player MP bar.
  - Settings/dashboard strings referencing dice
- Greppable cleanup: `dice` and `attackRolls` should not appear outside historical commits and tests intentionally renamed. Run `grep -ri 'dice' src/ --exclude-dir=__tests__` and verify only intentional matches remain.

### Sub-phase 2e — NES.css migration for remaining RPG views

After combat is on NES.css (2b), migrate the rest of the "RPG views":

- **Map:** `src/app/(workspace)/map/_components/*` — encounter cards, enemy cards, region panels. Convert containers to `nes-container`, action buttons to `nes-btn`. Drop dice notation from `enemy-card.component.tsx` (already in 2c).
- **Inventory:** `src/app/(workspace)/inventory/_components/*` — item grid, item detail dialog, kill-record list, equip/unequip controls. Item-stats display uses `nes-list is-disc` or similar.
- **Character / class screens:** wherever class stats, tier badges, ability loadout are shown. Loadout grid uses NES.css containers; ability slots reuse the combat ability button styling for consistency.
- **Quest screens:** `src/app/(workspace)/quests/[questId]/page.tsx` shell + any sibling quest UI components outside the combat arena.

Each migrated screen is wrapped in the `.rpg-ui` scope class on its layout segment so productivity views are unaffected. Verify by toggling between `/tasks` (Tailwind) and `/quests/[id]` (NES.css) — visual styles remain isolated.

Delete `panelChrome` export once all consumers are migrated (`src/components/combat/combat-styles.ts`).

### Phase 2 risks

- **Item stat translation may unbalance loadouts.** Going from `2d6` (avg 7) attack dice to a flat bonus needs care — pick a scaling factor (e.g., `attackDice * 3` → flat) during the items rewrite to preserve approximate parity.
- **No e2e tests** for combat — confirmed via glob. Manual playthrough required at end of each sub-phase.
- **Dashboard widget removal** may leave layout holes — verify visual.
- **NES.css scope leak.** If the `.rpg-ui` wrapper scoping isn't airtight, NES.css resets/styles can leak into productivity views and break Tailwind. Test by visiting `/tasks`/`/dashboard` after each NES.css PR.
- **Press Start 2P readability.** Cramped at small sizes — confined to display-only headings (24px+). Body text uses Pixelify Sans which renders cleanly at 12–14px.
- **NES.css custom container shadows** clash with current `panelChrome` shadow if both render. Migrate atomically per screen.

---

## Phase 3 — Deferred (not in this plan)

"Doesn't feel gamy" is a separate effort: animation polish, sound design, more lore/world touchpoints, character progression visibility outside combat, retro/16-bit aesthetic consistency per the design doc. Tracked here as acknowledgement, not scope.

---

## Critical files

### Phase 1
- `src/hooks/use-combat.hook.ts` (sprite + MP fixes, sync templateId)
- `src/components/combat/player-info.component.tsx` (NaN guard)
- `src/components/combat/enemy-info.component.tsx` (add MP bar)
- `src/shared/types/gamification.types.ts` (`EnemyState` + mana fields)
- `src/shared/types/tactical-combat.types.ts` (TACTICAL_STATE_VERSION bump, mana fields)
- `prisma/schema.prisma` (`User.dateFormat`)
- `src/utils/format-date.util.ts` (NEW)
- `src/hooks/use-format-date.hook.ts` (NEW)
- `src/app/(workspace)/settings/page.tsx` (settings control)
- `public/locales/en/translation.json` + `public/locales/es/translation.json`
- ~12 date-rendering call sites listed above

### Phase 2 — server engine (2a)
- `src/server/utils/combat/move-resolution.ts` (NEW)
- `src/server/utils/combat/combat-formula.ts` (NEW)
- `src/server/utils/combat/attack-resolution.ts` (DELETE)
- `src/server/utils/combat/dice.ts` (DELETE)
- `src/server/utils/combat/doctrine-buffs.ts` (drop dice-coupled buff fields)
- `src/shared/constants/doctrines.ts` (add power/damageType/recoilPercent; translation)
- `src/shared/constants/enemies.ts` (add `moves: string[]`)
- `src/shared/types/doctrine.types.ts` (DoctrineDefinition extension)
- `src/server/routers/quest.router.ts` (`executeMove` procedure; delete legacy)

### Phase 2 — client UI (2b)
- `src/components/combat/combat-action-bar.component.tsx` (move grid)
- `src/hooks/use-combat.hook.ts` (drop dice; add useMove)
- `src/components/combat/dice-roller.component.tsx` (DELETE)
- `src/components/combat/dice-result.component.tsx` (DELETE)
- `src/app/(workspace)/quests/[questId]/page.tsx` (drop diceBank prop)

### Phase 2 — mana economy + items (2c)
- `src/server/services/mana.service.ts` (NEW)
- `src/server/services/dice.service.ts` (DELETE)
- `src/shared/constants/rewards.ts` (NEW — `MANA_REWARDS`)
- `src/server/services/task.service.ts` (replace dice grant)
- `src/server/services/habit.service.ts` (replace dice grant)
- `src/server/services/objective.service.ts` (replace dice grant)
- `src/server/services/journal.service.ts` (replace dice grant)
- `src/server/utils/character.utils.ts` (drop diceBank extractor)
- `src/server/services/dashboard.service.ts` (replace diceBank with mana)
- `src/shared/constants/items.ts` (replace dice stats with flat bonuses)
- `src/components/common/item-stats-display.component.tsx` (render flat stats)
- `src/app/(workspace)/map/_components/enemy-card.component.tsx` (drop dice notation)
- `prisma/schema.prisma` (add `Character.manaReserve Int @default(0)`; change line 86 `Character.data` default → `"{}"`; one migration)
- `src/server/services/quest.service.ts` (call `topUpFromReserve` at encounter start)

### Phase 2 — AI/balance/i18n (2d)
- `src/server/utils/combat/enemy-ai.ts` (move selection)
- `public/locales/en/translation.json` + `public/locales/es/translation.json` (full dice → mana sweep)

### Phase 2 — NES.css migration (2b setup + 2e expansion)
- `package.json` (add `nes.css`)
- `src/app/(workspace)/(rpg)/layout.tsx` (NEW — RPG-views layout segment, NES.css import, font setup, `.rpg-ui` scope wrapper)
- `src/styles/nes-overrides.css` (NEW — color token mapping, scoped resets, font CSS vars)
- `src/components/combat/combat-styles.ts` (deprecate `panelChrome` for combat; eventual delete)
- All combat components (use `nes-container`, `nes-progress`, `nes-btn`)
- `src/app/(workspace)/map/_components/*` (NES.css migration)
- `src/app/(workspace)/inventory/_components/*` (NES.css migration)
- `src/app/(workspace)/quests/[questId]/page.tsx` + sibling quest UI

### Reuse (do not reinvent)
- Status effect engine: `src/shared/types/doctrine.types.ts` (`StatusEffect`, `ActiveStatusEffect`)
- Defeat handling: `src/server/utils/combat/rewards.ts` (`processEnemyDefeat`)
- Animations: `src/hooks/use-combat-animations.hook.ts` (damage numbers, attack/heal/death)
- HP bar: `src/app/(workspace)/map/_components/health-bar.component.tsx`
- Combat log enum: `CombatLogType` in `src/shared/types/gamification.types.ts`

---

## Verification

### Phase 1
1. **Branch off `main`** (do NOT stack on `feat/guilds`).
2. Sprite bug: enter combat 5× from a fresh page load. Sprite renders every time. Force a 404 by temporarily renaming `/public/assets/enemies/<X>.png`; confirm fallback chain still kicks in for genuinely missing templates.
3. MP bar: trigger a state where `maxMana = 0` (mock or new low-tier class). Bar hidden / empty, no NaN.
4. Enemy MP bar: visible on existing enemies (0/0 until Phase 2 hydrates them); hidden when `maxMana === 0`.
5. Date format: change setting → reload → verify `task-table` and `objective-card` reflect new format. Run `npm run lint && npm run typecheck && npm test`.
6. i18n: switch `es` locale, confirm new strings render.

### Phase 2 (per sub-phase)
- 2a: server unit tests (`move-resolution.test.ts`) green; manual combat playthrough — moves resolve, damage shown, no dice anywhere on screen.
- 2b: move grid appears; greyed when mana low; basic_strike free; mana drops on use; damage numbers display; crits show CRIT badge. Pixelify Sans renders for ability names + HP/MP labels; Press Start 2P only on screen titles.
- 2c: complete a task → mana increases. Surplus past `maxMana` accumulates in `Character.manaReserve` and the `+N` reserve badge appears on the MP bar. Same for habit, objective, journal. Spend mana in a fight → win → next encounter top-up drains reserve back into mana. Dashboard shows mana, not dice. Item tooltips show flat stats. Equip an item → character class stats change. UI reads "Abilities" everywhere "Doctrines" used to appear.
- 2d: enemy uses moves; MP bar drops on use; enemy AI doesn't lock on a too-expensive move. Final grep `grep -ri 'dice' src/ --exclude-dir=__tests__` shows no production matches.
- 2e: visit each migrated RPG view (combat, map, inventory, character, quest) — NES.css renders, fonts apply. Visit each productivity view (`/tasks`, `/habits`, `/dashboard`, `/settings`, `/journaling`, `/guilds`, `/objectives`, `/calendar`) — Tailwind style intact, original font intact, no NES.css leak. Verify HP/MP labels readable on mobile widths.

### Branch hygiene
- Phase 1 PR branches off `main`, not `feat/guilds`.
- Each Phase 2 sub-phase is its own PR. `main` is shippable after each merge — but the dice system is fully gone after 2a.
