# MVP Scope Cut: Focus on Solo RPG Productivity Loop

## Context

Covenant has been built well past MVP scope. Phases 1 and 2 of `roadmap.md` are checked off, including ~30 user-facing features across productivity, combat, crafting, shop, factions, forum, investments, doctrines, morality, and lore — but the app has not launched. Phase 3 of the founder's own roadmap explicitly states the directive being executed here:

> _"Foco absoluto: Eliminar cualquier elemento que no contribuya a validar el core."_

**Decisions taken (from clarifying Q&A):**

- **MVP hypothesis to validate:** _RPG progression motivates productivity_ (solo loop, not social).
- **Cut style:** Delete code outright (smallest surface area to maintain).
- **Target user:** Productivity nerds who like RPGs (Todoist + Diablo overlap).

**The single core loop the MVP must validate:**

```
Complete real tasks/habits → earn dice + gold
                          → spend dice in combat
                          → defeat enemies → loot + tier progression + story progression (choices and consequences)
                          → unlock better gear → harder enemies
```

Anything not on that loop is noise that obscures the validation signal and inflates onboarding friction. Everything below is judged against this loop.

---

## Cut List (delete code outright)

### Forum + Faction social system — DELETE

Why: Social is a separate hypothesis (community-driven retention), not the one we're testing. Forum requires moderation + critical mass; it will be empty at launch.

Delete:

- Routes: `src/app/(workspace)/forum/` (all subroutes)
- Router: `src/server/routers/forum.router.ts` and removal from root router
- Service: `src/server/services/forum.service.ts`
- Repository: `src/server/repositories/forum.repository.ts`
- Prisma model: `ForumComment` (`prisma/schema.prisma:294-314`) + migration
- `Character.forumComments` relation (line 93)
- Types: `src/shared/types/forum.types.ts`
- Sidebar nav entry for forum
- i18n keys under `forum.*` in both locales

Faction itself becomes vestigial — keep `Character.factionName` as cosmetic theme tag (it drives `User.theme` color), but remove all functional faction logic. After the forum + investment deletions above, the only remaining `factionName` usages are cosmetic: `character.repository.ts:129` (default `HOLY_KNIGHTS` on creation), `character.repository.ts:281` (faction setter from onboarding), `character.service.ts:46` (projection), and the type fields in `character.types.ts:25` and `gamification.types.ts:178`. Leave these in place. No additional faction-gated logic remains to be removed.

### Investments — DELETE

Why: Collaborative gold pools require N>1 users in same faction at same time. Zero validation value pre-launch.

Delete:

- Route: `src/app/(workspace)/investments/`
- Router: `src/server/routers/investment.router.ts`
- Service: `src/server/services/investment.service.ts`
- Repository: `src/server/repositories/investment.repository.ts`
- Prisma models: `Investment`, `InvestmentContribution` (lines 264-292)
- `Character.investmentContributions` relation (line 92)
- Constants: `src/shared/constants/investments.ts` (orphaned once `investment.service.ts` is gone)
- Types: `src/shared/types/investment.types.ts`
- Seed/script: `src/server/scripts/investments.sql`
- Sidebar nav entry

Note: The cron route (`src/app/api/cron/deadline/route.ts`) is **not deleted** — it also handles activity deadlines which are kept. Only remove the investment expiry block from `src/server/services/deadline.service.ts` (`findExpiredInvestments` call and the loop that follows it) and remove the `investmentRepository` constructor argument and property from that service.

### Crafting — DELETE (with full materials cascade)

Why: ~470 LOC of meta-progression on top of the base loop. Items can come from shop + combat drops. Crafting is a depth feature for retained users, not new ones.

Crafting touches the shop and the character schema, so the cascade must be deleted in one pass — leaving any of these dangling will break compilation or orphan UI:

- Route: `src/app/(workspace)/crafting/` and its `_components/`
- Router: `src/server/routers/crafting.router.ts`
- Service: `src/server/services/crafting.service.ts`
- Constants: `src/shared/constants/recipes.ts`, `src/shared/constants/materials.ts`, `src/shared/constants/shop-materials.ts`
- Types: `src/shared/types/crafting.types.ts` (note: this also exports `ShopMaterialInfo`, which is imported by the shop — see store edits below)
- `Character.materials` JSON field (`prisma/schema.prisma:88`) + migration
- Sidebar nav entry

Shop cleanup (consequence of dropping materials):

- `src/app/(workspace)/shop/page.tsx` — remove the `<ShopMaterialGrid>` block (line ~222) and its data prop wiring; remove the `ShopMaterialGrid` import
- `src/app/(workspace)/shop/_components/shop-material-grid.component.tsx` — delete
- `src/app/(workspace)/shop/_components/shop-material-card.component.tsx` — delete
- `src/server/services/store.services.ts` — remove the imports `getMaterialById` (line 8), `canPurchaseMaterial`, `getAvailableShopMaterials`, `getMaterialPrice`, `SHOP_MATERIALS` (line 9); remove the `materials` array build (~line 136), the `materials` field on the returned shop payload (~line 152), and the "Add materials to character" purchase branch (~line 194). The store keeps items-only.

### Morality system — DELETE

Why: `CharacterClass.morality` tracks 0–100 alignment but no narrative branches exist that read it. Pure dead code.

Note on schema location: morality lives on the **`CharacterClass`** model (`prisma/schema.prisma:114`, inside `model CharacterClass { ... }`), not on `Character`. The migration drops the column from `CharacterClass`. The character-service projection reads it via `c.morality` where `c` is the current class row (`character.service.ts:68`).

Delete:

- `morality` field from the `CharacterClass` model in `prisma/schema.prisma` + migration
- `src/shared/constants/morality.ts` and `src/shared/types/morality.types.ts`
- In `src/server/services/character.service.ts`: remove `adjustMorality()` method (line 310+), its `MoralityChange` return type import (line 9), `clampMorality`/`getMoralityStatus` imports (line 4), and the `morality` field from the character data-fetch projection (line 68)
- Investment service also calls `adjustMorality` — that entire service is deleted, so no separate action needed there
- Any UI badge or display rendering `morality`

### Doctrines — TRIM (not full delete)

Why: 50+ abilities × 4 classes is a balance nightmare. But doctrines ARE on the core loop (combat depth from progression). Keep enough for class identity, drop the long tail.

Delete:

- All non-class-signature doctrines in `src/shared/constants/doctrines.ts`
- Reduce from ~50 to ~3 per class (12 total)

Keep:

- `CharacterClass.equippedDoctrines` field, doctrine cast in combat, mana cost.
- **Tactical-doctrine subsystem stays as-is**: `combat.service.ts:executeTacticalDoctrine`, `src/server/utils/combat/tactical-doctrine.ts`, the `executeTacticalDoctrine` mutation in `activity.router.ts:132`, and the corresponding `combat.service.test.ts` cases. This is the actual doctrine-cast mechanic in combat — load-bearing for the core loop, not a parallel system.
- **Magic-nature gating on doctrines stays**: each surviving doctrine keeps its `magicNature` tag. The onboarding quiz, `Character.magicNature` field, combat UI display (`combat-arena.component.tsx`, `player-display.component.tsx`, `doctrine-panel.component.tsx`), and `magic-nature-badge.component.tsx` all remain wired together. No doctrine decoupling needed.

### Multiple Activity Templates — TRIM

Why: 8+ faction-aligned community activities lose their meaning once factions are vestigial.

Delete: most entries in `activities.constants.ts`. Keep 2–3 generic templates ("Patrol the Wastes", "Hunt the Heretic") with varied difficulty.

Keep: `MapActivity`, `ActivityParticipation`, `CombatEnemy` models — these are the combat backbone.

## Keep As-Is (the actual MVP)

- `Task`, `Habit`, `Objective`, `Area` models + their routers/services — productivity core
- `Character` + `CharacterClass` (single active class) — identity + progression
- Dice bank system — the bridge between productivity and RPG (load-bearing)
- Tier progression (1–10 linear) — the long-term goal
- Combat (simplified per #7 and #8) — the payoff loop
- Inventory + Loadout + simplified Shop — the gear loop
- Dashboard, Settings, Auth, Onboarding
- Landing, `/news`, `/roadmap` static pages
- i18n (en/es) — already built, near-zero ongoing cost

---

## Critical files to modify

**Delete (whole files/dirs):**

- `src/app/(workspace)/forum/`
- `src/app/(workspace)/investments/`
- `src/app/(workspace)/crafting/`
- `src/app/(workspace)/shop/_components/shop-material-grid.component.tsx`
- `src/app/(workspace)/shop/_components/shop-material-card.component.tsx`
- `src/server/routers/{forum,investment,crafting}.router.ts`
- `src/server/services/{forum,investment,crafting}.service.ts`
- `src/server/repositories/{forum,investment}.repository.ts`
- `src/server/scripts/investments.sql`
- `src/shared/constants/{morality.ts,investments.ts,recipes.ts,materials.ts,shop-materials.ts}`
- `src/shared/types/{morality.types.ts,forum.types.ts,investment.types.ts,crafting.types.ts}`
- Test files for deleted services: `src/server/__tests__/services/forum.service.test.ts`

Note: there is no `src/app/(workspace)/magic-nature/` or top-level `src/app/magic-nature/` to delete. The landing-page `src/app/(landing)/magic-nature/` and `src/app/(landing)/story/` directories **stay** — magic-nature is being kept (see Doctrines section), and story supports the narrative loop.

**Edit (partially — remove investment sections only, keep the rest):**

- `src/server/services/deadline.service.ts` — remove `findExpiredInvestments` call, the expired-investments loop, and the `investmentRepository` dependency
- `src/server/__tests__/services/deadline.service.test.ts` — remove all test cases that mock or exercise `findExpiredInvestments`; keep tests for activity deadline logic
- `src/server/__tests__/services/character.service.test.ts` — remove `adjustMorality` test cases
- `src/server/__tests__/fixtures/character.fixtures.ts` — remove `morality` field if present (it lives on `CharacterClass`, so it may be in a nested class fixture rather than the top-level character fixture)

**Edit:**

- `prisma/schema.prisma` — remove `ForumComment`, `Investment`, `InvestmentContribution` models; drop `Character.materials` (line 88), `Character.investmentContributions` (line 92), `Character.forumComments` (line 93), and `CharacterClass.morality` (line 114). **`Character.magicNature` (line 87) is kept.**
- Create migration: `npx prisma migrate dev --name mvp_scope_cut`
- `src/server/routers/_app.ts` (root router) — remove deleted routers from registry
- `src/server/services/service.factory.ts` — remove deleted service registrations
- `src/server/services/store.services.ts` — strip the SHOP_MATERIALS/getAvailableShopMaterials code path (see Crafting section above)
- `src/app/(workspace)/shop/page.tsx` — remove `<ShopMaterialGrid>` and its import (see Crafting section)
- `src/shared/constants/doctrines.ts` — trim to ~12 doctrines (keep their existing `magicNature` tags intact)
- `src/shared/constants/activities.ts` — trim to 2–3 templates
- Sidebar nav component (find via `grep` for nav items) — remove forum/investments/crafting links
- `public/locales/en/translation.json` and `es/translation.json` — drop unused keys
- `roadmap.md` — mark cut items, document MVP scope decision

Note: The magic-nature personality quiz in onboarding is **kept and stays fully wired**. `Character.magicNature` is preserved on the schema, surviving doctrines retain their `magicNature` tag, and the combat UI continues to render the magic-nature badge. No decoupling work needed.

Note: Task view options (Table, Matrix, etc.) are **kept as-is**. No trim needed.

Note: Activities faction filter UI is **deferred** — the activity list will be trimmed to 2–3 generic templates but the filter UI is left unchanged for now. Track as a follow-up once the core loop is validated.

---

## Execution order (to avoid broken intermediate states)

- **Routers first:** delete router entries from `_app.ts` (frontend tRPC types collapse, but tsc tells you exactly where to fix)
- **Routes/UI:** delete `(workspace)/forum`, `investments`, `crafting` route folders + their `_components/`
- **Shop material cleanup:** delete `shop/_components/shop-material-{grid,card}.component.tsx`; remove `<ShopMaterialGrid>` block and its import from `shop/page.tsx`; strip SHOP_MATERIALS imports and code paths from `store.services.ts`
- **Sidebar nav:** remove the dead links (forum, investments, crafting)
- **Services + repos:** delete service files and `{forum,investment}.repository.ts`; remove registrations from `service.factory.ts`
- **Deadline service cleanup:** remove investment expiry block from `deadline.service.ts` and drop its `investmentRepository` dependency
- **Morality service cleanup:** in `character.service.ts`, remove `adjustMorality()` method, morality imports, and `morality` field from data projection; delete `src/shared/constants/morality.ts` and `src/shared/types/morality.types.ts`
- **Tests:** delete `forum.service.test.ts`; edit `deadline.service.test.ts` to remove investment test cases; edit `character.service.test.ts` to remove `adjustMorality` cases; remove `morality` from `character.fixtures.ts` if present
- **Constants trim:** doctrines (~12 total, 3 per class — keep `magicNature` tags), activities (~3 generic templates); delete orphaned constants/types: `investments.ts`, `recipes.ts`, `materials.ts`, `shop-materials.ts`, `forum.types.ts`, `investment.types.ts`, `crafting.types.ts`; delete `src/server/scripts/investments.sql`
- **Schema cut:** edit `prisma/schema.prisma` to remove `ForumComment`, `Investment`, `InvestmentContribution` models; drop `Character.materials`, `Character.investmentContributions`, `Character.forumComments`, and `CharacterClass.morality`; **leave `Character.magicNature` and `Character.factionName` intact**; then `npx prisma migrate dev --name mvp_scope_cut`
- **i18n cleanup:** drop dead translation keys (low priority — won't break runtime)
- **Verify:** `pnpm tsc --noEmit && pnpm lint && pnpm test`

---

## Verification

The MVP is validated when a fresh user can run the loop end-to-end:

1. **Sign up** → land on onboarding (name + class + magic-nature quiz) → arrive at dashboard
2. **Create a task, complete it** → see dice bank go up; see XP/tier progress
3. **Create a habit, complete it** → dice bank goes up; consistency bonus visible
4. **Go to map** → start an activity → enter combat → spend dice → defeat enemy → earn gold + tier progress
5. **Visit shop** → spend gold on a tier-1 item → equip it → return to combat → see stat improvement
6. **Reach tier 2** → unlock better gear / second doctrine slot

Run `pnpm dev` and walk this loop manually in the browser. Then run:

- `pnpm tsc --noEmit` — clean
- `pnpm lint` — clean
- `pnpm test` — green (forum test deleted; deadline + character tests edited to remove investment/morality cases)

If steps 1–6 work without referencing forum, investments, crafting, or morality, the cut is correct. Magic-nature must still appear in onboarding and on the combat doctrine panel. Story pages must still be reachable from the combat/narrative flow.

---

## What this is NOT

This plan does NOT delete the productivity layer. Tasks, habits, objectives, areas, dashboard remain untouched.

This plan does NOT lock out the cut features forever. Once the core loop is validated with real users, forum/investments/crafting can come back from `git log` in days, not weeks. The Prisma migrations are reversible. Deletion is a launch-velocity decision, not a permanent product decision.

---

## Estimated impact

- **Deleted:** ~3 routers, ~3 services, ~2 repositories, ~10 route folders, 3 Prisma models, 3 fields, ~38 doctrines, ~5 activities. Roughly 30–40% reduction in user-facing surface area.
- **Onboarding friction:** drops noticeably (no faction-tied lore, fewer nav items) while retaining the magic-nature quiz for character flavor.
- **Maintenance burden:** one shop+combat+character+productivity loop to keep working, instead of nine intertwined systems.
