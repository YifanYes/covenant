# Guild System

## Why

Habitica's removal of guilds is a documented churn driver. Covenant's solo loop (dice → combat → tier → gear) needs a social companion hypothesis: peer accountability and group affiliation are the strongest known retention multipliers in productivity-RPG hybrids.

Phase 1 ships the **smallest social retention surface** that lets a user create a guild, invite friends via shareable link, and chat. Campaigns and exclusive rewards are deferred to Phase 2 / 3 — they only justify themselves once Phase 1 retention signal is validated with the beta cohort.

## Decisions Locked (Phase 1)

| Decision | Choice | Why |
| --- | --- | --- |
| Membership | **Single guild per user** | Mirrors Character 1:1; simpler invariants. Unique constraint on `GuildMember.userId`. |
| Discovery | **Invite-only via shareable link** | No public directory ⇒ no abuse surface (search, capacity floods, moderation queue). |
| Forum delivery | **Polling 7s** | No SSE/WS infra spike. Existing tRPC + TanStack Query pattern. |
| Active invites per guild | **Cap of 5** | Limits link sprawl + abuse blast radius without forcing single-link UX. |
| Default invite expiry | **7 days (168h max)** | Long enough for async onboarding, short enough to bound stale-link risk. |
| Faction inheritance | **Guild faction = creator's `User.theme`** (fallback `HOLY_KNIGHTS`) | Keeps cosmetic theme aligned with founding member; no extra picker UI. |
| Slice | **Phase 1 only** | Campaigns + rewards explicitly deferred. |

## What Shipped (Phase 1)

### Schema (`prisma/schema.prisma`)

Four new models, synced via `pnpm db:push` (matches prod `railway.toml` startCommand — project does not use `prisma migrate deploy`).

- `Guild` — `id` (uuid), `name`, `description`, `ownerId` (text, Better Auth), `factionName`, `capacity` (default 50)
- `GuildMember` — composite (`guildId`, `userId`, `role` ∈ `OWNER` | `OFFICER` | `MEMBER`), **unique on `userId`** (single-guild)
- `GuildMessage` — chat messages, soft-deleted via `deletedAt`
- `GuildInvite` — token-based shareable link, `expiresAt`, optional `maxUses`, `usedCount`, `revokedAt`

`User` updated with reverse relations (`guildMembership`, `ownedGuilds`, `guildMessages`).

### Backend

- **Schemas**: `src/shared/schemas/guilds.schemas.ts` — Zod for all inputs + `GuildRole` enum. `updateRoleSchema` restricts target role to `OFFICER | MEMBER` (owner role transitions go through `transferOwnership` only). `inviteTokenSchema` enforces `^[a-f0-9]{48}$`.
- **Repositories** (`src/server/repositories/`): `guild`, `guild-member`, `guild-message`, `guild-invite`
- **Service** (`src/server/services/guild.service.ts`):
  - `createGuild`, `getMyGuild`, `updateGuild`, `dissolveGuild`
  - `leaveGuild` (last-owner guard: blocks if other members exist; auto-dissolves if sole member)
  - `transferOwnership` (demotes prior owner to OFFICER; rejects self-transfer + ghost target)
  - `kickMember`, `updateRole` (role-matrix enforcement)
  - `createInvite` (capped at `MAX_ACTIVE_INVITES_PER_GUILD = 5`), `revokeInvite`, `listInvites`, `getInvitePreview`, `joinByToken`
  - `getMessages`, `sendMessage`, `deleteMessage` (author / OFFICER / OWNER)
  - Tokens: `crypto.randomBytes(24).toString('hex')` (48-hex), default 7-day expiry
  - Atomic invite claim: `updateMany` with predicate-narrowed `where` (revokedAt null, expiresAt gt now, usedCount lt maxUses) — compare-and-swap before insert
  - Permission helper: `requireRole(guildId, userId, allowedRoles[])` — generic "Resource not found or access denied" errors per existing convention
  - Prisma `P2002` (unique violation) translated to "You already belong to a guild" in `createGuild` + `joinByToken`
  - Faction default: `user.theme ?? 'HOLY_KNIGHTS'`
- **Service factory**: registered as L2 (`src/server/services/service.factory.ts`)
- **Router** (`src/server/routers/guilds.router.ts`): **16 procedures**
  - Queries: `getMyGuild`, `listInvites`, `getInvitePreview`, `getMessages`
  - Mutations: `create`, `update`, `dissolve`, `leave`, `transferOwnership`, `kickMember`, `updateRole`, `createInvite`, `revokeInvite`, `joinByToken`, `sendMessage`, `deleteMessage`
  - Rate limits: `RATE_LIMITS.strict` for guild lifecycle + invite preview/join; `RATE_LIMITS.write` for member/message/invite mgmt mutations

### Frontend

Routes under `src/app/(workspace)/guilds/`:

- `page.tsx` — landing: empty-state + Create dialog + join-by-link input when unaffiliated; redirect to `[guildId]` otherwise
- `[guildId]/page.tsx` — tabbed view: **Forum** (default) / **Members** / **Settings** (officer+ only). Header dropdown (`MoreVertical`) exposes Leave (members) or Dissolve (owner)
- `join/[token]/page.tsx` — invite preview + accept

Components in `_components/`:

- `create-guild-dialog.component.tsx`
- `guild-forum.component.tsx` — polled at 7s via TanStack `refetchInterval`, `refetchIntervalInBackground: false`, scroll-to-bottom on new messages, inline delete for moderators / authors
- `member-list.component.tsx` — role badges, kick + promote/demote actions
- `invite-link-card.component.tsx` — generate / copy / revoke
- `join-by-link-input.component.tsx` — paste full URL or token, parses `/guilds/join/<token>` and routes to preview page
- `user-avatar.component.tsx` — shared avatar primitive

Sidebar entry added to **RPG** section (`Shield` icon). `/guilds` added to `RPG_ROUTES` in `src/app/(workspace)/layout.tsx`.

### i18n

`guilds.*` namespace added to `public/locales/{en,es}/translation.json`. Tone: friendly, funny, RPG-themed (per AGENTS.md copy guidelines).

### Tests

`src/server/__tests__/services/guild.service.test.ts` — **48 vitest cases** covering:

- `createGuild` — rejects already-affiliated user, creates owner-membership atomically, translates P2002 to friendly error
- `updateGuild` / `dissolveGuild` — owner-only enforcement
- `joinByToken` — rejects expired / revoked / exhausted (pre-tx) / over-capacity (in-tx) / already-affiliated; verifies atomic claim returning count 0; verifies P2002-in-tx translation
- `leaveGuild` — last-owner guard, sole-member dissolve, normal-leave, missing-membership
- `kickMember` — full permission matrix (OWNER/OFFICER/MEMBER × OWNER/OFFICER/MEMBER target)
- `updateRole` — self-role-change rejected, non-owner caller rejected, member→officer happy path
- `deleteMessage` — author / OFFICER / OWNER allowed; plain MEMBER blocked; non-member blocked
- `transferOwnership` — happy path (demotes prior owner), self-transfer rejected, ghost target rejected
- `createInvite` — active-invite cap, below-cap creation
- `revokeInvite` — missing invite, non-officer/owner rejected, officer happy path
- `getInvitePreview` — missing token, valid active, expired flag, revoked flag, exhausted flag

Full suite green. `pnpm lint` ✓ · `npx tsc --noEmit` ✓ · `pnpm build` ✓.

## Known Caveats (inherited)

- **Capacity-check phantom-read race in `joinByToken`** — `count` runs *inside* the `$transaction` but Prisma/Postgres default isolation (`READ COMMITTED`) does not lock the member set. Two concurrent joiners can each read `count < capacity` before either insert, allowing the guild to exceed `capacity` by 1. Fix when needed: bump tx isolation to `SERIALIZABLE`, take an advisory lock keyed on `guildId`, or add a partial-unique invariant. Phase 1-acceptable.
- **`GuildInvite.createdBy` has no FK** — plain text, audit-only. Becomes dangling text if creator deletes account. Harmless.
- **Owner account deletion cascades to guild** — `User → Guild.ownerId onDelete: Cascade`. Sole-owner closing account = guild gone. Intended for MVP.
- **`transferOwnership` API-only** — no dedicated UI button in Phase 1. Test via tRPC devtools or defer until Phase 1.5.
- **Header actions in dropdown** — Leave / Dissolve live behind `MoreVertical` rather than as primary buttons. Intentional to keep tablist + member-progress as the primary header content; revisit if discoverability complaints surface.

## UI Smoke Test Checklist

Two browsers (one + incognito), `pnpm dev`. Walk this in order:

### Solo path

- [ ] `/guilds` shows empty state with "Found a Guild" CTA + join-by-link input when user has no guild
- [ ] Open Create dialog → submit empty name → Zod blocks (name min 3)
- [ ] Submit valid name → toast success → redirect to `/guilds/<id>`
- [ ] Sidebar shows **Guilds** entry under RPG section, faction-themed
- [ ] `/guilds` re-visit auto-redirects to `/guilds/<id>` (already affiliated)
- [ ] Header shows guild name, role badge, member progress `1 / 50`, dropdown with **Dissolve** (owner)

### Invite + join

- [ ] **Settings** tab visible (owner sees it)
- [ ] Generate invite link → URL appears with `/guilds/join/<token>`
- [ ] Copy button → toast "copied"; verify clipboard contents
- [ ] Generate 5 invites → 6th attempt rejected with active-invite cap message
- [ ] Open invite URL in second browser (logged in as different user) → preview shows guild name + `1 / 50 members`
- [ ] Click **Join Guild** → toast success → lands on `/guilds/<id>`
- [ ] Alt path: paste invite URL into join-by-link input on `/guilds` empty state → routes to preview
- [ ] First browser: refresh / re-fetch → member count = `2 / 50`, second user appears in **Members** tab

### Forum

- [ ] User A sends message → appears in own list within ~7s
- [ ] User B sees A's message within ~7s (polling)
- [ ] Empty content disabled (Send button greyed)
- [ ] >2000 chars rejected by textarea `maxLength`
- [ ] B sends message → A sees it within ~7s
- [ ] A (owner) hovers B's message → trash icon appears → click → message disappears for both
- [ ] B hovers own message → trash icon appears → click → message disappears for both
- [ ] B (member) hovers A's message → no trash icon (no permission)

### Member management

- [ ] **Members** tab lists owner + member with correct role badges
- [ ] Owner promotes B to OFFICER → badge updates → B sees Settings tab on next refresh
- [ ] Owner demotes B back to MEMBER → Settings tab disappears for B
- [ ] Owner kicks B → B disappears from list; B's `/guilds` shows empty state again
- [ ] B re-joins via fresh invite (or same invite if not expired)

### Ownership transfer

- [ ] Phase 1 ships `transferOwnership` mutation but no dedicated UI button. Test via tRPC devtools or skip until Phase 1.5.

### Leave + dissolve

- [ ] B (member) opens dropdown → Leave → confirm dialog → leaves → routes to `/guilds` empty state
- [ ] A (sole owner) Leave — auto-dissolves the guild
- [ ] A with other members present clicks Leave — API throws "Transfer ownership before leaving"
- [ ] A clicks Dissolve → confirm → guild deleted → routes to `/guilds` empty state
- [ ] All members, messages, invites cascade-deleted (verify via DB or attempt re-visit `/guilds/<old-id>`)

### Invite edge cases

- [ ] Owner revokes invite → second user opens link → preview shows "revoked"
- [ ] Wait past expiry (or set short expiry via API) → preview shows "expired"
- [ ] Invite with `maxUses: 1` → first user joins fine; second hits "use limit"
- [ ] User already in another guild → join attempt throws "You already belong to a guild"
- [ ] Guild at `capacity` (50) → join throws "Guild is at capacity"

### Auth + edge

- [ ] Unauthenticated user opens `/guilds/join/<token>` → routed to login (workspace layout enforces)
- [ ] After login, manually re-open link → join works
- [ ] `/guilds/<wrong-id>` (id of a guild user is not in) → "not a member" message
- [ ] Page-level i18n: switch locale to `es` → all guild strings render in Spanish

### Polling sanity

- [ ] Forum tab idle → network panel shows `getMessages` re-fetch every ~7s
- [ ] Switch to other tab in browser → `refetchIntervalInBackground: false` should pause polling
- [ ] Return to tab → polling resumes

---

## Phase 2 — Guild Campaigns

Shared progress goals across guild members. Validates "group accountability" beyond passive chat.

### Decisions Locked (Phase 2)

| Decision | Choice | Why |
| --- | --- | --- |
| Concurrency | **One active campaign per guild** | Simpler UI, clearer focus. Service-layer enforced (no partial-unique constraint). |
| Reward model | **Equal split, per-entry snapshot at completion** | When the campaign target is reached, `share = floor(rewardPool.gold / contributorCount)` is stamped onto each `GuildCampaignProgress.goldClaimed` field. Claim is deterministic — late contributors created after completion keep `goldClaimed = 0` and are excluded by the claim's `updateMany` predicate. The completion `updateMany` itself is conditional on `completedAt: null`, so concurrent target-crossers race for the snapshot once. |
| Permissions | **Owner + Officer can start** | Matches invite-create permissions. |
| Expiry semantics | **`expiresAt` blocks new contributions only** | Claims remain open after expiry if the campaign completed before expiry. |
| Hook isolation | **`recordEvent` errors swallowed + logged** | User actions (kill, habit, task) never fail because of campaign tracking. |
| Templates | **Hardcoded constants** (`src/shared/constants/guild-campaigns.ts`) | 4 templates: `KILL_RAMPAGE`, `HABIT_CRUSADE`, `TASK_SWEEP`, `GOLD_RUSH`. |

### What Shipped

**Schema** (`prisma/schema.prisma`):

- `GuildCampaign` — `id`, `guildId`, `templateId`, `eventType`, `target`, `progress`, `rewardPool` (Json), `startedBy`, `startedAt`, `expiresAt`, `completedAt`, `contributorCount` (snapshotted on completion)
- `GuildCampaignProgress` — per-member contribution tally + claim state. Unique on `(campaignId, userId)`. Tracks `contribution`, `claimedAt`, `goldClaimed` (snapshotted share, stamped at completion).

**Constants** (`src/shared/constants/guild-campaigns.ts`):

- `CAMPAIGN_EVENT_TYPE` enum: `ENEMY_KILL`, `HABIT_COMPLETION`, `TASK_COMPLETION`, `GOLD_EARNED`
- `CAMPAIGN_TEMPLATES`: 4 templates listed above, each with `defaultTarget`, `durationDays`, `rewardPool: { gold }`.

**Backend** (campaign code lives alongside Phase 1 in the same `guild` module):

- **Repository**: campaign methods (`findActiveCampaignByGuild`, `findCurrentCampaignByGuildWithEntries`, `findCampaignById`, `listCampaignsByGuild`, `createCampaign`) added to `guild.repository.ts`.
- **Service** (`guild.service.ts`): `startCampaign`, `getCurrentCampaign` (returns the most-recent campaign regardless of completion state so completed campaigns remain claimable in the UI), `listCampaignHistory`, `recordCampaignEvent` (atomic upsert + race-safe completion snapshot — wins via conditional `updateMany` on `completedAt: null`, then stamps `goldClaimed` per entry), `claimCampaignReward` (atomic claim via `updateMany` predicate-narrowed to `goldClaimed > 0 AND claimedAt IS NULL`, then credits `character.gold`).
- **Factory**: `GuildService` gains `characterRepository` dep; the single `guild` service is injected into `HabitService`, `TaskService`, `CombatService` (and `processEnemyDefeat` via `CombatRewardDeps.guildService`).
- **Router**: campaign procedures (`getCurrentCampaign`, `getCampaignHistory`, `startCampaign`, `claimCampaignReward`) added to `guilds.router.ts`. Single router avoids fan-out; tRPC inference depth held in check by shaping `startCampaign`'s return type (no raw `Prisma.JsonValue` for `rewardPool`).

**Hooks**:

- `HabitService.createCompletion` → `HABIT_COMPLETION`
- `TaskService.update` (on transition to completing status) → `TASK_COMPLETION`
- `processEnemyDefeat` (combat reward path) → `ENEMY_KILL` (+1) and `GOLD_EARNED` (+goldReward)
- All hooks `recordEvent` failures swallowed in-service.

**Frontend**:

- `_components/campaign-panel.component.tsx` — active campaign card with progress bar, leaderboard (top 25 contributors), claim button when completed, recent history when no active campaign
- `_components/start-campaign-dialog.component.tsx` — template picker for officer+
- Guild detail page (`[guildId]/page.tsx`) gains a **Campaigns** tab (between Forum and Members)

**i18n**: `guilds.campaigns.*` namespace in both `en` and `es`.

**Tests** (`guild-campaign.service.test.ts` — 19 vitest cases): start permission matrix, unknown template, active-campaign conflict; `recordEvent` no-op paths (no guild, no active, wrong event type, expired, amount ≤ 0); target-crossing stamps `goldClaimed` per contributor entry; race-safe completion (losing tx skips snapshot); error swallowing; claim rejects non-member / not-completed / non-contributor / late-contributor (`goldClaimed = 0`) / double-claim; claim awards the snapshotted share.

### Known Caveats (Phase 2)

- **One-active enforcement is service-layer only** — concurrent `startCampaign` calls could create two active campaigns. Phase 1-acceptable, same family of races as the existing capacity phantom-read caveat.
- **Leftover gold from non-claimers is lost** — by design. Snapshot makes claim deterministic; unclaimed shares stay in the pool indefinitely.
- **Late contributions after completion still record contribution but earn no reward** — their entry has `goldClaimed = 0`. Acceptable: contributions across the target boundary are rare and the UX cost (showing them on the leaderboard with no claim) is minor.
- **No campaign-end push notification** — completion is observed via the 7s poll on `getCurrentCampaign`. Push notifications deferred.

## Phase 3 — Exclusive Rewards + Progression Bonuses (deferred)

**Goal**: make guild membership a tangible mechanical advantage, not just social.

**Schema additions**:

- `Item.guildExclusive: Boolean` — purchasable only via guild reward pool
- `Guild.tier: Int` + `Guild.totalContribution: Int` — guild-wide progression accrued from member activity
- Guild-tier modifiers: small XP / gold buffs (e.g. +5% per guild tier) applied at `dice.service.ts` reward calc

**Service touch points**: `store.services.ts`, `character.service.ts`, `dice.service.ts`.

**Defer until**: Phase 1 + 2 retention signal validated with beta cohort (cohort retention ≥ X% week-over-week vs solo control).
