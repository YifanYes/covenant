# Tavern

> **Version**: 0.3 (draft)
> **Status**: Proposed
> **Last Updated**: 2026-05-16
> **Source**: product review of Habitica feedback and Covenant's current mana/quest loop. v0.3 scope-cut: extracted Warfronts to `docs/specs/warfronts.md`; removed SYSTEM message / admin / right-rail content from v1.

## Summary

The **Tavern** is Covenant's global chat: the account-wide common room where all players can see that the world is alive and talk across guild boundaries.

The adjacent **Warfronts** system (see `docs/specs/warfronts.md`) will later surface inside the Tavern as system messages, but Tavern v1 ships without them.

## Product thesis

Covenant's core loop is:

```text
real work -> mana/reserve -> combat/quests -> character/world progress
```

The Tavern's job is social presence. It should make users feel like other players exist in the same war, without becoming Discord, DMs, or a moderation sink.

## Goals

1. Provide one official, global, in-app chat surface named **Tavern**.
2. Validate the surface cheaply with foreground polling + manual refresh, not realtime.
3. Keep moderation bounded for a solo-dev beta — author-only delete + auto-hide threshold, no admin tooling.
4. Preserve Covenant's native loop: productivity grants mana; chat is presence, not progression.

## Non-goals

- Recreate Discord (channels, voice, DMs, file uploads, bots, rich embeds).
- Habitica-style task/habit damage.
- Habitica-style rest mode.
- Replace Guild Forums. Guilds remain private, group-scoped.
- Anonymous posting. Authenticated users only.
- User-uploaded images/attachments.
- SYSTEM messages in v1 (deferred to the Warfronts spec).
- Admin role / moderation tooling beyond reports and auto-hide (no `users.role` exists).

## State today

- Guilds have a polling-based Forum (`docs/product/guild_system.md`) scoped to private groups; pattern reference: `src/app/(workspace)/guilds/_components/guild-forum.component.tsx` (7s foreground poll, 5-min same-author grouping, 2000-char limit).
- No global chat exists.
- No admin role exists in `users` or Better Auth.
- Rate-limit middleware exists at `src/server/trpc.ts` (`rateLimit(RATE_LIMITS.*)`).
- No WebSocket or managed realtime provider is currently in the architecture.

## Phase 1 — Tavern global chat

### Experience

`/tavern` opens a single global chat room with:

- Persistent message history with cursor infinite scroll for older messages.
- 15 s foreground-only polling for new messages while the tab is visible.
- Manual `Refresh` button + "Last updated {relative time}" timestamp.
- "New messages" affordance when the poll fetches newer rows but the user is scrolled up — never yank scroll position.
- Author-only delete on own messages.
- Report button on others' messages; auto-hide after threshold.

### Chat rules

- Authenticated users only (`protectedProcedure`).
- One global channel in v1: `tavern:global` (single logical room, no `channelId` in v1).
- Plain text only. Content stored as-is, rendered with React auto-escape.
- 500-character message cap (tighter than Guild's 2000 because global = wider audience).
- No DMs, no images/uploads, no link unfurls.
- URLs not auto-linked. No active URL detection or stripping — plain-text rendering already prevents XSS and click-through.
- Server-side rate limit: `RATE_LIMITS.chat = { windowMs: 30_000, maxRequests: 5 }` (per-user). Tavern is `protectedProcedure` so the existing IP-fallback path is dead; one knob is sufficient.
- Moderation:
  - Report button on each non-author message.
  - One report per `(messageId, reporterId)`. Confirm modal, no reason field. `TavernMessageReport.reason` stays nullable for future use.
  - Auto-hide from feed when `reportCount >= 3`. Row persists; only filtered out of query results.
  - Author may soft-delete own messages (`deletedAt`).
  - **Deferred:** admin/officer delete, blocked-terms list, global slow mode. Kill-switch via env var (`TAVERN_DISABLED=1`) is the v1 incident lever.

### UI

- `/tavern` lives under the workspace route group.
- **Joins the RPG-views set** (CONTEXT.md): NES.css scope, Pixelify Sans body, Press Start 2P display. Consistent with `/guilds`.
- Sidebar entry: `Tavern` under `Guilds` in the RPG sidebar.
- Layout:
  - message stream (single column, no right rail in v1)
  - 5-minute same-author grouping (match `guild-forum.component.tsx`)
  - composer docked at bottom with `Send` and char counter
  - `Refresh` button + "Last updated {relative time}" near the top
  - "Load older" button at the top of the list (cursor pagination)
- Empty state: _"The fire is lit. The ale is flowing. The room is waiting for its first rumor."_

---

## Transport plan

Tavern v1 is **low-frequency foreground polling**, not realtime.

### Phase 1 transport — tRPC polling + manual refresh

```text
Browser -> tRPC getMessages(cursor?)         -> Next.js -> Postgres
Browser -> tRPC sendMessage(content)         -> Next.js -> Postgres
Browser -> tRPC deleteMessage(id)            -> Next.js -> Postgres (author-only)
Browser -> tRPC reportMessage(messageId)     -> Next.js -> Postgres (incr reportCount)
```

Client behavior:

- On page load: fetch latest 50 ordered by `createdAt desc, id desc`.
- `useQuery` with `refetchInterval: 15_000` and `refetchIntervalInBackground: false`.
- `Refresh` button manually invalidates the query.
- Sending a message uses a normal tRPC mutation and invalidates.
- "Load older" fetches the next 50 using cursor `(createdAt, id)`.

Pros: no new infra, fits existing tRPC + TanStack Query patterns, low moderation pressure.
Cons: not live, no presence, no high-volume conversations.

### Phase 2 — managed realtime (Ably / Pusher)

Out of scope for v1. Revisit only when:

- Tavern shows recurring daily use.
- Users complain about freshness.
- Warfronts ship and need a live ticker.

### Phase 3 — native WebSocket service

Out of scope for v1. Revisit only if managed-realtime cost exceeds owning the infra and Covenant has dedicated headroom for Redis/pub-sub fanout.

---

## Data model

```prisma
model TavernMessage {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String
  characterId String    @db.Uuid          // frozen at send; non-null because v1 has no SYSTEM messages
  content     String    @db.VarChar(500)
  createdAt   DateTime  @default(now()) @db.Timestamp(6)
  deletedAt   DateTime? @db.Timestamp(6)  // author-only soft delete
  reportCount Int       @default(0)       // auto-hide when >= 3

  @@index([createdAt, id])
  @@index([userId, createdAt])
  @@map("tavern_messages")
}

model TavernMessageReport {
  id         String   @id @default(uuid()) @db.Uuid
  messageId  String   @db.Uuid
  reporterId String
  reason     String?  @db.VarChar(255)    // nullable; v1 UI does not collect a reason
  createdAt  DateTime @default(now()) @db.Timestamp(6)

  @@unique([messageId, reporterId])
  @@index([messageId])
  @@map("tavern_message_reports")
}
```

Notes:

- `userId` is `String` (not `@db.Uuid`) because Better Auth IDs are text — see AGENTS.md Gotchas.
- `characterId` is frozen at send time so renamed/deleted characters still attribute correctly in history.
- No `kind` column in v1. Reintroduce when Warfronts ship.
- The `getMessages` query filters `deletedAt IS NULL AND reportCount < 3`.

Deferred:

- `TavernMute` for per-user temporary moderation.
- `TavernChannel` if global chat later splits.
- `TavernPresenceSnapshot` for live presence analytics.

## Service / router map

| Surface          | File                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| Schema           | `prisma/schema.prisma`                                                          |
| Zod schemas      | `src/shared/schemas/tavern.schemas.ts`                                          |
| Repository       | `src/server/repositories/tavern-message.repository.ts`                          |
| Service          | `src/server/services/tavern.service.ts`                                         |
| Service factory  | `src/server/services/service.factory.ts`                                        |
| Router           | `src/server/routers/tavern.router.ts`                                           |
| Page             | `src/app/(workspace)/tavern/page.tsx`                                           |
| Components       | `src/app/(workspace)/tavern/_components/{message-list,composer}.component.tsx`  |
| i18n             | `public/locales/{en,es}/translation.json` under `tavern.*`                      |
| Rate-limit tier  | `src/server/trpc.ts` — add `RATE_LIMITS.chat = { windowMs: 30_000, maxRequests: 5 }` |
| Tests            | `src/server/__tests__/services/tavern.service.test.ts`                          |

Router shape:

```ts
tavern.getMessages({ cursor?: { createdAt: Date; id: string }, limit?: number })
tavern.sendMessage({ content: string })            // rateLimit(RATE_LIMITS.chat)
tavern.deleteMessage({ id: string })               // author-only
tavern.reportMessage({ messageId: string })        // one per (messageId, reporterId)
```

---

## Open design questions

- **Realtime upgrade trigger**: what usage threshold justifies Ably/Pusher? Revisit only after Tavern has recurring daily use.
- **Global chat volume**: one channel is simplest. Split only after volume makes one stream unusable.
- **Moderation escalation**: when do we add an admin role? Likely when Warfronts ship (cron-authored SYSTEM messages need a producer) or after the first abuse incident, whichever comes first.

## Items deliberately deferred

| Item                          | Why deferred                                                  |
| ----------------------------- | ------------------------------------------------------------- |
| DMs                           | Large safety/abuse surface.                                   |
| Attachments / images          | Requires upload moderation.                                   |
| Rich embeds / link unfurls    | Phishing and moderation risk.                                 |
| Multiple channels             | Premature before volume exists.                               |
| User-created channels         | Moderation and discoverability cost.                          |
| SYSTEM messages               | No v1 producer; reintroduces with Warfronts.                  |
| Admin / moderator role        | No role model in DB; report + auto-hide is enough for beta.   |
| Blocked-terms list            | False-positive heavy; add only after a real incident.         |
| Global slow mode              | Kill-switch env var is enough for incidents.                  |
| URL detection / stripping     | Plain-text rendering already removes XSS/click risk.          |
| Presence / online count       | Approximations are misleading at low concurrent counts.       |
| Right rail                    | Empty in v1 (Warfronts split out).                            |
| Tavern Inn / rest mode        | Not native to Covenant mechanics.                             |
| Direct task/habit boss damage | Bypasses Covenant's mana/combat loop.                         |

## Risks

- **Moderation overrun**: even a small global chat has higher risk than a notice board. Mitigate with rate limit, reports, auto-hide, no uploads, and `TAVERN_DISABLED=1` kill-switch.
- **Chat feels stale**: 15 s polling may feel slow if multiple users are active. Mitigate with clear last-updated state, Refresh button, send-then-refetch, "New messages" affordance.
- **Premature realtime spend**: do not migrate transport until usage justifies it.
- **Chat without Warfronts feels idle**: v1 leans on player-authored content only. Acceptable for a validation slice; if engagement is low, Warfronts (the planned content engine) are the answer, not realtime.

## Cross-references

- `docs/specs/warfronts.md` — shared world objectives; will reintroduce SYSTEM messages into Tavern.
- `docs/product/quest_system.md` — current quests; the productivity → mana → combat loop Tavern stays out of.
- `docs/product/guild_system.md` — adjacent private social surface; pattern reference at `src/app/(workspace)/guilds/_components/guild-forum.component.tsx`.
- `docs/specs/freemium_model.md` — Tavern chat remains free in v1.
- `docs/habitica_feedback.md` — source feedback on lost social spaces; do not copy task-damage loop.
- `CONTEXT.md` — RPG-views set (Tavern joins it).
- `AGENTS.md` — rate-limit infra, Better Auth ID types, `protectedProcedure`.
