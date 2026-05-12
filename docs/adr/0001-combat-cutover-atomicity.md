# Combat redesign ships as one atomic PR, no feature flag

The Pokémon-style combat rewrite (formerly Phase 2 sub-phases 2a + 2b + 2c) merges in one PR rather than three sequential ones. The three sub-phases (server engine, client UI, mana/items/dashboard) are interdependent — landing any subset leaves `main` either broken at the type level (UI calls deleted procedures) or broken at the gameplay level (combat consumes mana but completions still grant the deleted dice-bank, so mana never refills and the second Encounter onward is unplayable). 2B (AI/balance/i18n) and 2C (NES.css migration for `/inventory`, `/shop`, `/guilds`) remain independent PRs that ship afterward.

## Considered options

- **Feature flag (`COMBAT_V2_ENABLED`)** — lets each sub-phase land independently behind the flag. Rejected: project preference against flags for short-lived rollouts, plus flag-removal becomes a fourth PR with its own risk.
- **Long-lived `combat-v2` branch** — hold 2a/2b/2c on a feature branch, merge to `main` when all three are ready. Rejected: loses the PR-by-PR review benefit anyway, and rebases against `main` over multi-week work are expensive.
- **One atomic PR with internal commit structure** (chosen) — reviewers can still walk the diff commit-by-commit; `main` is only ever shippable.

## Consequences

- Single big diff (~25 modified files, several deletes, two new services). Reviewers need to walk by commit, not file.
- No partial rollback: reverting the combat rewrite reverts everything in 2A together. Acceptable because the resource model swap is one logical unit.
