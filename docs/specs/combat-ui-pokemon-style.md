# Combat UI: Pokémon-Style Redesign Spec

## Overview

Restyle the combat arena at `/quests/[questId]` to match the visual layout of a classic Pokémon battle screen: diagonal sprite/info-box arrangement, message box + 1×3 command row at the bottom, faction-themed chrome, and per-quest scenic backgrounds.

This is a **view-layer transformation only**. No changes to `useCombat` hook, mutations, animations, dice math, schemas, services, routers, or sprite assets.

## Goals

- Diagonal battle layout: enemy info top-left, enemy sprite top-right, player sprite middle-left, player info middle-right (all four pieces inside the battle-scene grid; the action region sits below).
- Bottom UI: message box (left) + 1×3 horizontal command row (right) — Atacar / Doctrina / Objeto.
- Per-quest scenic background art with graceful fallback when assets are missing.
- Faction-aware accent coloring via existing CSS variable system (no per-faction conditionals in component code).
- Pokémon-style chrome on every panel: 2px border, hard offset shadow, rounded corners.
- All current functionality preserved (roll → results → attack, doctrine targeting, potions, victory/defeat dialogs, animations, damage numbers).

## Non-Goals

- Sourcing/generating the scene background PNGs (separate follow-up).
- Typewriter-effect message log animation.
- Mobile-specific reflow (combat is desktop-first).
- Sound effects, screen shake, or new particle effects.
- Flee/Run command (Covenant combat has no flee mechanic).

## Layout

```
┌──────────────────────────────────────────────────┐
│  [enemy info]                                    │
│                                ╭────────╮        │
│                                │ ENEMY  │        │
│                                ╰───◯────╯        │
│                                                  │
│           ╭────────╮                             │
│           │ PLAYER │              [player info]  │
│           ╰───◯────╯                             │
├──────────────────────────────────────────────────┤
│  ╭──────────────────╮  ╭──────┬──────────┬─────╮ │
│  │ Tu turno         │  │Atacar│ Doctrina │Obje.│ │
│  │ Banco: 999       │  │      │          │     │ │
│  ╰──────────────────╯  ╰──────┴──────────┴─────╯ │
└──────────────────────────────────────────────────┘
```

**Battle scene**: `relative` container with three layered children: gradient (`bg-gradient-to-b from-card via-background to-muted`), scenic image (`<Image fill object-cover opacity-60>` — see scene-loading detail below), and a CSS grid (12 cols × 6 rows) holding all four diagonal pieces:

- Enemy info: row 1, col 1–5
- Enemy sprite: row 2–3, col 8–12
- Player sprite: row 4–5, col 1–4
- Player info: row 5, col 7–12

**Action region**: flex row with `<MessageBox />` (`flex-[2]`) + `<CombatActionBar />` (`flex-[1.2]`) — message box gets the larger share, mirroring Pokémon convention where the dialogue panel is wider than the command grid.

## Component Changes

### `src/components/combat/combat-arena.component.tsx`

- Replace stacked flex column with two-region layout (battle scene + action region).
- Render scenic background `<Image>` at `/assets/scenes/{questId}.png`. Track load failure with a local `useState<boolean>(false)` flipped to `true` in `onError`; conditionally skip the `<Image>` when the flag is set so the gradient layer underneath remains visible. Pass a `sizes="100vw"` prop to satisfy `next/image` `fill` mode.
- Add `MessageBox` as a small inline sub-component (single-use, tightly coupled to combat state — no separate file needed). It owns the targeting prompt copy; the action bar handles the cancel control. Renders:
  - Targeting prompt — `combat.targeting.single` / `combat.targeting.all` — when `combat.targetingMode` is set
  - Phase text otherwise: `combat.player_turn` / `combat.enemy_turn` / "..." while animating
  - Latest `combatLog` entry (if any) as a secondary line
  - **Banco de Datos: {diceBank}** (relocated from action bar)
  - During `victory` / `defeat` phases, MessageBox renders nothing — the existing alert dialog overlays the scene.

### Display components: split into one-default-export-per-file

To preserve the project convention (`export default function`), split each existing display component into two files. The old `enemy-display.component.tsx` and `player-display.component.tsx` files are **deleted**; their callers update to import the split pieces directly into the appropriate grid cells in `combat-arena.component.tsx`.

#### `src/components/combat/enemy-sprite.component.tsx` (new)

Default export. `CombatUnitSprite` + `transform: scaleX(-1)` flip + targeting click handler/ring + `DamageNumberContainer` + `<SpritePlatform />` (see below). Receives a single `enemy: EnemyState` prop plus targeting/animation/damage props.

#### `src/components/combat/enemy-info.component.tsx` (new)

Default export. Name + type badge + HealthBar + "HP" pixel label, wrapped in `panelChrome` className (see Styling).

#### `src/components/combat/player-sprite.component.tsx` (new)

Default export. `CombatUnitSprite` + flip + `DamageNumberContainer` + `<SpritePlatform />`.

#### `src/components/combat/player-info.component.tsx` (new)

Default export. Name + tier badge + magic nature + HP bar (Heart icon + "HP" label) + MP bar (Battery icon + "MP" label), wrapped in `panelChrome`.

#### `src/components/combat/sprite-platform.component.tsx` (new)

Default export. Tiny presentational component that renders the absolute-positioned shadow ellipse (classes in §Styling). Used by both sprite components to avoid duplicating the platform classes.

**Multi-enemy case**: stack `EnemyInfo` cards vertically in the top-left grid cell, `EnemySprite` instances horizontally in the top-right cell.

### `src/components/combat/combat-action-bar.component.tsx`

Replace left-tabs/right-content layout. Single `view` state: `'menu' | 'attack' | 'doctrine' | 'item'`.

| View             | Renders                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `menu` (default) | 1×3 row of pixel-bordered command buttons: Atacar, Doctrina, Objeto. Each `flex-1 h-full`, hover → `bg-primary/10`, active → `bg-primary text-primary-foreground`. Disabled when `disabled`. |
| `attack`         | `DiceRoller` + roll button → after `attackRolls` exists, swap to `DiceResult` rows + Confirm Attack. Volver pill (`t('common.back')`) returns to `menu`.                                     |
| `doctrine`       | `DoctrinePanel` + Volver pill.                                                                                                                                                               |
| `item`           | Existing consumables list + Volver pill.                                                                                                                                                     |

**`view` lifecycle**: the only writes to `view` are (a) the user clicking a command tile in `menu` (set), (b) the user clicking the Volver pill (set to `menu`), (c) `useEffect`-driven resets to `menu` when any of the following happen, so a stale sub-screen never lingers across turns:

- `disabled` flips from `false` → `true` (turn handed to enemy)
- `attackRolls` transitions from non-null → null after a confirm-attack
- `selectedDoctrineId` transitions from non-null → null after a doctrine cast or cancel

**Targeting collapse**: when `targetingMode` is set (i.e., a doctrine has been selected and is awaiting a target click on an enemy sprite), the action bar replaces the 1×3 row with a single full-width tile bound to `onCancelDoctrine`, labeled with `t('combat.targeting.cancel')`. The MessageBox owns the prompt copy ("Selecciona objetivo…") — there is no duplicate prompt inside the action bar.

Dice bank counter is **removed** from this component (now lives in `MessageBox`).

### `src/app/(workspace)/quests/[questId]/page.tsx`

No structural change. Already passes `questId` to `CombatArena`.

## Styling

All chrome uses existing CSS-variable Tailwind tokens that cascade per faction via `src/styles/faction-themes.css`. **No faction conditionals in component code.**

The Pokémon panel chrome is reused across four call sites (player info, enemy info, message box, command bar container). To avoid drift, define it once and reuse:

```ts
// src/components/combat/combat-styles.ts (new)
export const panelChrome = 'border-2 border-primary/60 bg-card rounded-md shadow-[3px_3px_0_0_rgba(0,0,0,0.35)]'
```

Import `panelChrome` from this module in each of the four components and compose with `cn(panelChrome, …)`.

| Element                 | Classes                                                                                                                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pokémon panel chrome    | `panelChrome` constant (above)                                                                                                                                                                                                                                                                    |
| Sprite platform ellipse | `absolute -bottom-1 left-1/2 -translate-x-1/2 h-3 w-24 rounded-[50%] bg-foreground/25 blur-[2px]` — encapsulated in `<SpritePlatform />`; no caller writes these classes directly                                                                                                                 |
| Background fallback     | `bg-gradient-to-b from-card via-background to-muted`                                                                                                                                                                                                                                              |
| Scene image overlay     | `<Image fill object-cover sizes="100vw" className="opacity-60" />` — **no** `imageRendering: pixelated` here. DESIGN.md applies pixelated rendering globally to `img`, so the override is unnecessary; future scene art may also be painted rather than pixel-art and we don't want to crunch it. |
| Active command tile     | `bg-primary text-primary-foreground`                                                                                                                                                                                                                                                              |
| Hover command tile      | `bg-primary/10`                                                                                                                                                                                                                                                                                   |
| HP/MP labels            | `text-[10px] font-bold tracking-widest text-primary`                                                                                                                                                                                                                                              |

The hard offset shadow (no blur) is the visual signature of Pokémon UI chrome and reads correctly on both dark and light faction themes.

## Assets

Convention: `/public/assets/scenes/{questId}.png`. Three scenes needed (current quests):

- `patrol_north_gate.png`
- `assault_the_harbor.png`
- `defend_the_southern_wall.png`

Fallback: missing scene → gradient only. Implementation ships with the `onError` fallback wired; PNGs added in a follow-up.

## i18n

All user-facing strings go through `t()`. Add to BOTH `public/locales/en/translation.json` and `public/locales/es/translation.json`:

- `common.back` — Volver pill label inside `attack`/`doctrine`/`item` sub-views. Currently absent from the `common` namespace (a `back` key exists under `onboarding` but is not reusable). Add `"back": "Back"` / `"back": "Volver"`.
- `combat.targeting.cancel` — full-width cancel tile shown in place of the 1×3 row when targeting is active. Add `"cancel": "Cancel selection"` / `"cancel": "Cancelar selección"`. (Reusing `common.cancel` would also work, but the targeting affordance benefits from a more specific verb.)

All other keys reused as-is: `combat.player_turn`, `combat.enemy_turn`, `combat.action.attack/doctrine/item`, `combat.attack_rolls`, `combat.defense_rolls`, `combat.results`, `combat.targeting.single`, `combat.targeting.all`, `inventory.dice_bank`, etc.

## Out of Scope (Preserved)

These remain untouched:

- `use-combat.hook.ts`, `use-combat-animations.hook.ts`
- `src/components/combat/combat-unit-sprite.component.tsx`, `src/components/combat/damage-number.component.tsx`
- `src/app/(workspace)/map/_components/dice-result.component.tsx`, `src/app/(workspace)/map/_components/dice-roller.component.tsx`, `src/app/(workspace)/map/_components/health-bar.component.tsx` (reused from the map module — keep importing from this path)
- `src/components/doctrine-panel.component.tsx`
- All server services, routers, schemas
- Sprite assets (`/assets/classes/*`, `/assets/enemies/*`)
- Victory/defeat alert dialogs

## Verification

1. `pnpm tsc --noEmit` — no type errors after replacing the two display files with the five new ones (sprite/info/platform).
2. `pnpm dev` then `/quests/[questId]`:
   - Layout: enemy info top-left, enemy sprite top-right, player sprite middle-left, player info middle-right (all inside the battle scene); below that, message box (wider) + 1×3 command row.
   - Scenic background: renders gradient fallback when no PNG present (verify by visiting before assets ship); renders scene image at 60% opacity when PNG is added; `onError` on the `<Image>` flips a state flag and the image vanishes leaving the gradient.
   - Sprite platforms visible under both sprites; sprites still face each other.
   - Faction colors: change `<html>` class (e.g. `class="dark faction-legion"`) → info boxes / commands / chrome re-tint to faction primary.
   - Command flow: Atacar → DiceRoller → roll → results → Confirm Attack → action bar resets to `menu`. Doctrina → list → cast → message box prompt appears, action bar collapses to single full-width Cancel tile → click enemy sprite to target → action bar resets to `menu`. Objeto → potions → resets to `menu`.
   - `view` lifecycle: end of player turn (disabled flips true) snaps back to `menu`; you cannot land on enemy turn with a stale `attack` sub-screen.
   - Message box updates per phase, shows targeting prompt during targeting, shows dice bank counter, shows latest combat-log entry as secondary line. Hidden during victory/defeat (dialog overlays).
   - Damage numbers, animation states, HP/MP bars, victory/defeat dialogs unchanged.
3. i18n: confirm `common.back` and `combat.targeting.cancel` exist in both `en` and `es` translation files.
4. `pnpm test` — full suite passes.
5. Resize 1024px ↔ 1920px — diagonal grid stays diagonal, command row stays horizontal.

## Critical Files

- `src/components/combat/combat-arena.component.tsx` (rewrite layout, add inline `MessageBox`, scene-image error state)
- `src/components/combat/combat-action-bar.component.tsx` (rewrite to 1×3 menu + sub-view + lifecycle resets)
- `src/components/combat/enemy-display.component.tsx` (**delete**, replaced by split files below)
- `src/components/combat/player-display.component.tsx` (**delete**, replaced by split files below)
- `src/components/combat/enemy-sprite.component.tsx` (new)
- `src/components/combat/enemy-info.component.tsx` (new)
- `src/components/combat/player-sprite.component.tsx` (new)
- `src/components/combat/player-info.component.tsx` (new)
- `src/components/combat/sprite-platform.component.tsx` (new)
- `src/components/combat/combat-styles.ts` (new — `panelChrome` constant)
- `public/locales/en/translation.json`, `public/locales/es/translation.json` (add `common.back` and `combat.targeting.cancel`)
