# Guild System

Group-affiliation layer over the solo loop (dice → combat → tier → gear). Targets the retention multiplier Habitica lost when it removed guilds: peer accountability, shared progression, and exclusive group-only rewards.

Shipped in three phases — membership/chat (Phase 1) → shared campaigns (Phase 2) → tier progression + exclusive items (Phase 3). Spec canon in `docs/specs/guild_system.md`.

## Overview

A **Guild** is a closed, invite-only crew of up to 50 characters. One guild per user. Each guild has an owner, optional officers, a faction theme inherited from the founder, and three core surfaces: **Forum** (chat), **Campaigns** (shared goals), and **Members** (roster + roles). Officer+ also see a **Settings** tab.

Guild progression is independent of character progression. The guild has its own **tier** (1–5) earned by aggregate member contribution. Higher tier unlocks **gold buffs** and **guild-exclusive items** in the store.

## Membership

| Aspect | Behavior |
| --- | --- |
| Cardinality | One guild per user. Enforced by unique constraint on `GuildMember.userId`. |
| Capacity | 50 members. Default; not currently configurable. |
| Discovery | Invite-only. No public directory, no search. |
| Joining | Shareable link `/guilds/join/<token>`. Token = 48-hex (`crypto.randomBytes(24)`). |
| Faction | Inherited from creator's `User.theme`; fallback `HOLY_KNIGHTS`. Cosmetic only. |

### Roles

- **OWNER** — single, immutable except via `transferOwnership`. Full permissions.
- **OFFICER** — manages members, invites, campaigns, and moderates chat.
- **MEMBER** — default. Chat, contribute to campaigns, claim rewards.

Role matrix enforced in `requireRole(guildId, userId, allowedRoles[])`. Self-role-change rejected. Owners cannot demote themselves — only transfer ownership (auto-demotes prior owner to OFFICER).

### Leaving + dissolving

- Sole owner leaving auto-dissolves the guild.
- Owner with other members must transfer ownership before leaving (API throws).
- Dissolve cascades: members, messages, invites, campaigns, progress entries all deleted.
- Owner account deletion cascades to guild (`onDelete: Cascade` on `Guild.ownerId`).

## Invites

Officer+ generate shareable links via the Settings tab.

- Up to **5 active invites** per guild simultaneously (cap prevents link sprawl).
- Default expiry **7 days**, max 168h.
- Optional `maxUses` cap. Default unlimited until expiry.
- Revocable any time.
- Claim is atomic: predicate-narrowed `updateMany` (not-revoked, not-expired, under-use-limit) compare-and-swaps before the membership insert. Concurrent joiners cannot double-claim a 1-use invite.

### Invite preview states

The preview page (`/guilds/join/<token>`) renders one of:

| State | Trigger |
| --- | --- |
| Active | Token valid, not expired, not revoked, under use cap. |
| Expired | `expiresAt < now`. |
| Revoked | `revokedAt` set. |
| Exhausted | `usedCount >= maxUses`. |
| Already in guild | User already affiliated → "You already belong to a guild". |
| Guild full | Member count = capacity → "Guild is at capacity". |

## Forum

Per-guild chat under the **Forum** tab.

- **Polling at 7s** via TanStack Query `refetchInterval`. `refetchIntervalInBackground: false` pauses when tab not focused.
- Messages soft-deleted via `deletedAt` (preserved for audit, hidden in UI).
- Delete permission: author, officer, or owner.
- Max length 2000 chars (textarea `maxLength`).
- No threads, no reactions, no attachments in v1.

Polling rather than SSE/WebSocket was an explicit trade-off — keeps the infra surface to existing tRPC + TanStack Query.

## Campaigns

Shared progression goals across the guild. Validates "group accountability" beyond passive chat.

### Templates

Hardcoded in `src/shared/constants/guild-campaigns.ts`. One active campaign per guild at a time.

| Template | Event tracked | Default target | Duration |
| --- | --- | --- | --- |
| `KILL_RAMPAGE` | `ENEMY_KILL` | 50 kills | 7 days |
| `HABIT_CRUSADE` | `HABIT_COMPLETION` | 100 completions | 7 days |
| `TASK_SWEEP` | `TASK_COMPLETION` | 75 completions | 7 days |
| `GOLD_RUSH` | `GOLD_EARNED` | 5000 gold | 7 days |

### Event sourcing

Player actions emit campaign events server-side:

- `HabitService.createCompletion` → `HABIT_COMPLETION`
- `TaskService.update` (on status transition to complete) → `TASK_COMPLETION`
- `processEnemyDefeat` → `ENEMY_KILL` (+1) and `GOLD_EARNED` (+goldReward, post-multiplier)

Each event runs `recordCampaignEvent`. Failures are swallowed + logged — campaign tracking never breaks a user action.

### Rewards

Equal split, per-entry snapshot at completion.

1. Member contributions accrue in `GuildCampaignProgress.contribution`.
2. When `progress >= target`, a conditional `updateMany` on `completedAt: null` elects one winner across concurrent target-crossers. The winner stamps `contributorCount` on the campaign and `goldClaimed = floor(rewardPool.gold / contributorCount)` on each contributor's entry.
3. Members claim via the **Claim** button. Claim is an atomic `updateMany` filtered to `goldClaimed > 0 AND claimedAt IS NULL`, then credits `character.gold`.

Late contributors after completion record contribution but get `goldClaimed = 0`. Unclaimed shares are lost — by design.

### Permissions

- **Start**: owner + officer.
- **Contribute**: any member, automatically via event hooks.
- **Claim**: contributor only (`goldClaimed > 0`), once per campaign.

## Progression + Tier Buffs

Guild tier advances on aggregate contribution. Activity is always tracked — independent of whether a campaign is running.

### Tier thresholds

Exponential, cumulative `totalContribution`:

| Tier | Threshold | Gold buff |
| --- | --- | --- |
| 1 | 0 | +0% |
| 2 | 1000 | +5% |
| 3 | 5000 | +10% |
| 4 | 15000 | +15% |
| 5 | 40000 | +20% |

### Contribution weights

Per-event points (`computeContributionPoints`):

| Event | Points |
| --- | --- |
| `ENEMY_KILL` | 5 |
| `HABIT_COMPLETION` | 3 |
| `TASK_COMPLETION` | 4 |
| `GOLD_EARNED` | `floor(amount / 5)` |

GOLD_EARNED is divided to keep raw gold drops from dwarfing 1-per-event kill/habit/task ticks.

### Gold buff

Applied at `processEnemyDefeat` after `calculateGoldReward`. Multiplier from `getGuildGoldMultiplier(tier)` (1.0 → 1.20). `Math.floor` after multiply. The post-multiplier amount is what credits the character **and** feeds the next GOLD_EARNED event. Bounded feedback loop, capped by +20% at T5.

### Tier advance

After every contribution bump:

1. Atomic `prisma.guild.update` increments `totalContribution`.
2. Compute `getGuildTier(totalContribution)` — handles multi-threshold jumps.
3. Conditional `updateMany` on `tier < computed` elects one winner across concurrent crossings. Same CAS pattern as `joinByToken`.

### Failure isolation

`recordCampaignEvent` runs two independent try/catch blocks — the contribution bump and the campaign-match tracking. Either can fail without blocking the other or the user action that triggered them.

## Guild-Exclusive Items

Three items locked behind guild tier, sold for normal character gold in the standard store.

| Item | Tier | Slot |
| --- | --- | --- |
| `guild_vanguard_blade` | 2 | weapon (physical) |
| `guild_oathkeeper_staff` | 3 | weapon (magic) |
| `guild_aegis_plate` | 3 | armor |

Gate: `user has guild` AND `guild.tier >= item.tier`. Inaccessible items are hidden from the listing (no banner). `purchaseItems` rejects with "requires a Guild of Tier {N}".

Item definitions live in `src/shared/constants/items.ts` with `guildExclusive: true`.

## UX Surfaces

- **`/guilds` (landing)** — empty state with **Found a Guild** CTA + join-by-link input when unaffiliated. Auto-redirects to `/guilds/<id>` when already a member.
- **`/guilds/[guildId]`** — tabbed view: **Forum** (default) → **Campaigns** → **Members** → **Settings** (officer+). Header shows guild name, role badge, member progress `N / 50`, tier badge, contribution progress toward next threshold, current gold buff %, and a `MoreVertical` dropdown with **Leave** / **Dissolve**.
- **`/guilds/join/[token]`** — invite preview + Join button. Preview renders state (active / expired / revoked / exhausted) before attempting the join.
- **Sidebar** — `Guilds` entry under the **RPG** section, `Shield` icon, faction-themed.
- **Store** — guild-exclusive items appear when tier-eligible; silently filtered otherwise.

## i18n

`guilds.*` namespace in `public/locales/{en,es}/translation.json`. Sub-namespaces: `guilds.campaigns.*`, `guilds.progression.*`, and three `items.guild_*` keys. RPG-themed tone per AGENTS.md copy guidelines.

## Known Limits (Beta)

- **Capacity phantom-read race** in `joinByToken` — concurrent joiners can each see `count < capacity` under `READ COMMITTED` and exceed by 1. Acceptable at MVP scale; fix via `SERIALIZABLE` or advisory lock if it surfaces.
- **One-active-campaign enforcement is service-layer only** — concurrent `startCampaign` calls could create two active campaigns. Same race family as the capacity issue.
- **One-active tier-advance is service-layer only** — a hand-edited backwards `tier` row won't re-advance until the next event.
- **`transferOwnership` is API-only** — no dedicated UI button yet. Test via tRPC devtools.
- **Header actions in dropdown** — Leave / Dissolve hidden behind `MoreVertical` rather than primary buttons. Revisit if discoverability complaints surface.
- **`GuildInvite.createdBy` has no FK** — plain text, audit-only. Goes dangling if the creator deletes their account.
- **Owner account deletion cascades to guild** — sole-owner closing account = guild gone. MVP-intended.
- **No campaign-end push notification** — completion observed via 7s poll.
- **GOLD_EARNED tracks post-multiplier gold** — small bounded feedback loop, capped by +20% at T5.
- **Late contributions earn no reward** — entries created after completion have `goldClaimed = 0`. Rare enough to accept; minor UX cost on the leaderboard.
- **No "guild-exclusive" badge in the store** — inaccessible items are simply hidden. Add a badge if users ask "where are the guild items?".
- **Polling is 7s** — not real-time. Trade-off for infra simplicity.

## Source map

| Surface | File |
| --- | --- |
| Schema | `prisma/schema.prisma` (`Guild`, `GuildMember`, `GuildMessage`, `GuildInvite`, `GuildCampaign`, `GuildCampaignProgress`) |
| Zod schemas | `src/shared/schemas/guilds.schemas.ts` |
| Repositories | `src/server/repositories/guild{,-member,-message,-invite}.repository.ts` |
| Service | `src/server/services/guild.service.ts` |
| Service factory | `src/server/services/service.factory.ts` (L2, injected into store/habit/task/combat) |
| Router | `src/server/routers/guilds.router.ts` (21 procedures) |
| Campaign constants | `src/shared/constants/guild-campaigns.ts` |
| Progression constants | `src/shared/constants/guild-progression.ts` |
| Items | `src/shared/constants/items.ts` (`guildExclusive` flag + 3 entries) |
| Combat reward hook | `src/server/utils/combat/rewards.ts` (`processEnemyDefeat`) |
| Habit hook | `src/server/services/habit.service.ts` (`createCompletion`) |
| Task hook | `src/server/services/task.service.ts` (`update`) |
| Store gating | `src/server/services/store.service.ts` (`listAvailableItems`, `purchaseItems`) |
| Landing page | `src/app/(workspace)/guilds/page.tsx` |
| Guild detail | `src/app/(workspace)/guilds/[guildId]/page.tsx` |
| Invite preview | `src/app/(workspace)/guilds/join/[token]/page.tsx` |
| Components | `src/app/(workspace)/guilds/_components/` |
| i18n | `public/locales/{en,es}/translation.json` (`guilds.*`) |
| Tests | `src/server/__tests__/services/guild{,-campaign,-progression}.service.test.ts` |

See also: `docs/specs/guild_system.md` (canonical spec), `CONTEXT.md`, `docs/product/combat.md` (gold + event source).
