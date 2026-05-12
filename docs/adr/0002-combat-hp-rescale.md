# HP rescaled ×5 to calibrate the Gen-1 damage formula

The Pokémon-style combat rewrite adopts the Gen-1 damage formula `floor(((2L/5 + 2) * power * atk/def) / 50 + 2) * variance`, which was designed for Pokémon at L20–50 with HP 20–500. Covenant's existing HP values (player 5–11, enemies 2–5 at tier 1) put every hit into one-shot territory under this formula. To preserve formula shape and tuning intuition borrowed from Pokémon, **all HP literals (player class `baseHealth`, enemy `health`, status-effect DOT ticks, `thornsDamage`, `health_potion.healHealth`) are multiplied by 5 at the source**. Mana values are not rescaled.

## Considered options

- **Reduce `power` values instead** — keep HP, push `basic_strike` from 35 to ~5 and abilities down accordingly. Rejected: loses the Pokémon "feel" of power numbers (Tackle 35, Hyper Beam 150) that the rewrite is borrowing for player intuition.
- **Drop the Gen-1 formula** — use a simpler `damage = power * atk / def`. Rejected: gives up level scaling and the crit/variance shape that makes Pokémon combat feel like Pokémon combat.
- **Runtime `HP_RESCALE_FACTOR` constant** multiplied at read time. Rejected: adds a dependency every consumer must thread through, and the factor is never going to change at runtime — it's a one-time content migration.
- **HP×5 with pre-multiplied literals** (chosen) — `Templar.baseHealth: 6 → 30`, `skeleton.health: 3 → 15`, `BURNING: 1 → 5`, etc.

## Consequences

- One-time edit across `classes.ts`, `enemies.ts`, `enemy-ai.ts` (DOT ticks), `abilities.ts` (thorns), `items.ts` (health_potion). All values readable as final literals — no factor lookup.
- Items scaling factor (`dice → flat`) is **×1** rather than ×3, calibrated to the rescaled HP. Old `attackDice: 5` weapon → new `strengthAtkBonus: 5`.
- Future HP tuning happens in absolute numbers; the ×5 origin is documented here but not encoded anywhere.
- Existing characters' persisted HP values are immediately out-of-range; combat init reads `maxHealth` from `CLASS_BASE_STATS` so live values jump on next login. Acceptable for beta.
