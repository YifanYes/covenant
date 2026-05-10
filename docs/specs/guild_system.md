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
| Slice | **Phase 1 only** | Campaigns + rewards explicitly deferred. |

## What Shipped (Phase 1)

### Schema (`prisma/schema.prisma`)

Four new models, synced via `pnpm db:push` (matches prod `railway.toml` startCommand — project does not use `prisma migrate deploy`).

- `Guild` — `id` (uuid), `name`, `description`, `ownerId` (text, Better Auth), `factionName`, `capacity` (default 50)
- `GuildMember` — composite (`guildId`, `userId`, `role` ∈ `OWNER` | `OFFICER` | `MEMBER`), **unique on `userId`** (single-guild)
- `GuildMessage` — chat messages, soft-deleted via `deletedAt`
- `GuildInvite` — token-based shareable link, `expiresAt`, optional `maxUses`, `revokedAt`

`User` updated with reverse relations (`guildMembership`, `ownedGuilds`, `guildMessages`).

### Backend

- **Schemas**: `src/shared/schemas/guilds.schemas.ts` — Zod for all inputs + `GuildRole` enum
- **Repositories** (`src/server/repositories/`): `guild`, `guild-member`, `guild-message`, `guild-invite`
- **Service** (`src/server/services/guild.service.ts`):
  - `createGuild`, `getMyGuild`, `updateGuild`, `dissolveGuild`
  - `leaveGuild` (last-owner guard: blocks if other members exist; auto-dissolves if sole member)
  - `transferOwnership` (demotes prior owner to OFFICER)
  - `kickMember`, `updateRole` (role-matrix enforcement)
  - `createInvite`, `revokeInvite`, `listInvites`, `getInvitePreview`, `joinByToken`
  - `getMessages`, `sendMessage`, `deleteMessage` (author / OFFICER / OWNER)
  - Tokens: `crypto.randomBytes(24).toString('hex')`, default 7-day expiry
  - Permission helper: `requireRole(guildId, userId, allowedRoles[])` — generic "Resource not found or access denied" errors per existing convention
- **Service factory**: registered as L2 (`src/server/services/service.factory.ts`)
- **Router** (`src/server/routers/guilds.router.ts`): 14 procedures, mutations rate-limited via `RATE_LIMITS.write` / `RATE_LIMITS.strict`

### Frontend

Routes under `src/app/(workspace)/guilds/`:

- `page.tsx` — landing: empty-state + Create dialog when unaffiliated; redirect to `[guildId]` otherwise
- `[guildId]/page.tsx` — tabbed view: **Forum** (default) / **Members** / **Settings** (officer+ only). Header actions: Leave (members) or Dissolve (owner)
- `join/[token]/page.tsx` — invite preview + accept

Components in `_components/`:

- `create-guild-dialog.component.tsx`
- `guild-forum.component.tsx` — polled at 7s via TanStack `refetchInterval`, scroll-to-bottom on new messages, inline delete for moderators / authors
- `member-list.component.tsx` — role badges, kick + promote/demote actions
- `invite-link-card.component.tsx` — generate / copy / revoke

Sidebar entry added to **RPG** section (`Shield` icon). `/guilds` added to `RPG_ROUTES` in workspace layout.

### i18n

`guilds.*` namespace added to `public/locales/{en,es}/translation.json`. Tone: friendly, funny, RPG-themed (per AGENTS.md copy guidelines).

### Tests

`src/server/__tests__/services/guild.service.test.ts` — 25 vitest cases covering:

- `createGuild` — rejects already-affiliated user
- `joinByToken` — rejects expired / revoked / exhausted / over-capacity / already-affiliated
- `leaveGuild` — last-owner guard, sole-member dissolve, normal-leave
- `kickMember` — full permission matrix (OWNER/OFFICER/MEMBER × OWNER/OFFICER/MEMBER target)
- `deleteMessage` — author / OFFICER / OWNER allowed; plain MEMBER blocked
- `transferOwnership` — happy path, self-transfer rejected, ghost target rejected

Full suite: **346 passed**. `pnpm lint` ✓ · `npx tsc --noEmit` ✓ · `pnpm build` ✓.

## Known Caveats (inherited)

- **Race in `joinByToken` capacity check** — `countByGuild` runs *outside* the `$transaction`. Two concurrent joiners can both pass the count before either inserts. Acceptable for Phase 1; harden with `SERIALIZABLE` or in-tx count if real-world abuse appears.
- **`GuildInvite.createdBy` has no FK** — plain text, audit-only. Becomes dangling text if creator deletes account. Harmless.
- **Owner account deletion cascades to guild** — `User → Guild.ownerId onDelete: Cascade`. Sole-owner closing account = guild gone. Intended for MVP.

## UI Smoke Test Checklist

Two browsers (one + incognito), `pnpm dev`. Walk this in order:

### Solo path

- [ ] `/guilds` shows empty state with "Found a Guild" CTA when user has no guild
- [ ] Open Create dialog → submit empty name → Zod blocks (name min 3)
- [ ] Submit valid name → toast success → redirect to `/guilds/<id>`
- [ ] Sidebar shows **Guilds** entry under RPG section, faction-themed
- [ ] `/guilds` re-visit auto-redirects to `/guilds/<id>` (already affiliated)
- [ ] Header shows guild name, member count `1 / 50`, **Dissolve** button (owner)

### Invite + join

- [ ] **Settings** tab visible (owner sees it)
- [ ] Generate invite link → URL appears with `/guilds/join/<token>`
- [ ] Copy button → toast "copied"; verify clipboard contents
- [ ] Open invite URL in second browser (logged in as different user) → preview shows guild name + `1 / 50 members`
- [ ] Click **Join Guild** → toast success → lands on `/guilds/<id>`
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

- [ ] Owner promotes B to OFFICER (required for ownership transfer flow if implemented; Phase 1 only exposes via API — UI button can be added)
- [ ] Note: Phase 1 ships `transferOwnership` mutation but no dedicated UI button. Test via tRPC devtools or skip until Phase 1.5

### Leave + dissolve

- [ ] B (member) clicks Leave → confirm dialog → leaves → routes to `/guilds` empty state
- [ ] A (sole owner) clicks Leave — blocked? Phase 1 design: sole-owner Leave auto-dissolves; *with* other members the API throws "Transfer ownership before leaving"
- [ ] A clicks Dissolve → confirm → guild deleted → routes to `/guilds` empty state
- [ ] All members, messages, invites cascade-deleted (verify via DB or attempt re-visit `/guilds/<old-id>`)

### Invite edge cases

- [ ] Owner revokes invite → second user opens link → preview shows "revoked"
- [ ] Wait past expiry (or set short expiry via API) → preview shows "expired"
- [ ] Invite with `maxUses: 1` → first user joins fine; second hits "use limit"
- [ ] User already in another guild → join attempt throws "You already belong to a guild"
- [ ] Guild at `capacity` (50) → join throws "at capacity"

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

## Phase 2 — Guild Campaigns (deferred)

**Goal**: shared progress goals across guild members. Validates "group accountability" beyond passive chat.

**Schema**:

- `GuildCampaign` — `id`, `guildId`, `templateId`, `target`, `progress`, `rewardPool` (JSON), `startedAt`, `completedAt`, `expiresAt`
- `GuildCampaignProgress` — per-member contribution tally (`campaignId`, `userId`, `contribution`)

**Hooks**:

- `kill-record.service.ts` increments active campaign progress on enemy defeat
- `habit.service.ts` / `task.service.ts` increments on completion (if campaign template scopes to those events)

**UI**: campaign banner on guild overview, contribution leaderboard, claim-reward dialog on completion.

**Spec lives at**: `docs/specs/guild_campaigns.md` (write when starting Phase 2).

## Phase 3 — Exclusive Rewards + Progression Bonuses (deferred)

**Goal**: make guild membership a tangible mechanical advantage, not just social.

**Schema additions**:

- `Item.guildExclusive: Boolean` — purchasable only via guild reward pool
- `Guild.tier: Int` + `Guild.totalContribution: Int` — guild-wide progression accrued from member activity
- Guild-tier modifiers: small XP / gold buffs (e.g. +5% per guild tier) applied at `dice.service.ts` reward calc

**Service touch points**: `store.services.ts`, `character.service.ts`, `dice.service.ts`.

**Defer until**: Phase 1 + 2 retention signal validated with beta cohort (cohort retention ≥ X% week-over-week vs solo control).
