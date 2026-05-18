# Tavern

Global, account-wide common room. One in-app chat surface for the whole player base, sitting alongside private `Guild` Forums. Presence layer, not progression.

## Overview

The **Tavern** is Covenant's single global chat room at `/tavern`. Authenticated users post into one shared channel; everyone sees the same stream. Designed to validate social presence cheaply — no realtime infra, no DMs, no admin tooling. Productivity still drives mana and combat; the Tavern only proves the world is alive.

Joins the RPG-views set: NES.css scope, Pixelify Sans body, Press Start 2P display font. Sidebar entry: `Tavern` under `Guilds`.

## Experience

| Surface      | Behavior                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| Channel      | One global room (`tavern:global`). No channel selector.                                                         |
| Audience     | Authenticated users only (`protectedProcedure`).                                                                |
| History      | Cursor pagination, 50 per page, ordered `createdAt desc, id desc`.                                              |
| Freshness    | 15 s foreground-only poll + manual `Refresh` button + "Last updated {relative}" label.                          |
| New messages | "New messages" pill when the poll fetches newer rows while the user is scrolled up. Never yank scroll position. |
| Grouping     | 5-minute same-author grouping (matches Guild Forum).                                                            |
| Empty state  | _"The fire is lit. The ale is flowing. The room is waiting for its first rumor."_                               |

### Composer

- Plain text only. React auto-escape; no HTML, no markdown, no link unfurls.
- 500-character cap (tighter than Guild Forum's 2000 — wider audience).
- `Cmd/Ctrl+Enter` submits.
- Character counter turns amber under 100 remaining, destructive under 50.
- Send disabled until form is valid (non-empty after trim, within cap).
- Server-side rate limit `RATE_LIMITS.chat = { windowMs: 30_000, maxRequests: 5 }` per user.

### Moderation

| Action            | Rules                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Author delete     | Soft delete on own message (`deletedAt` set). Confirm dialog. Filtered from query.          |
| Report            | One-click flag on any non-author message. Confirm dialog, no reason field collected.        |
| Report uniqueness | Unique `(messageId, reporterId)`; duplicate report → `BAD_REQUEST`.                         |
| Self-report       | Rejected at service layer.                                                                  |
| Auto-hide         | Row stays in DB but is filtered from `getMessages` when `reportCount >= 3`.                 |
| Kill switch       | `TAVERN_DISABLED=1` blocks `sendMessage` (returns `SERVICE_UNAVAILABLE`). Reads still work. |

No admin role exists. No global slow mode, no blocked-terms list, no admin delete — beta scope deliberately bounded to author-delete + community auto-hide.

## Transport

Tavern v1 is **low-frequency foreground polling**, not realtime.

```text
Browser -> tRPC tavern.getMessages(cursor?, limit?)   -> Postgres
Browser -> tRPC tavern.sendMessage(content)           -> Postgres
Browser -> tRPC tavern.deleteMessage(id)              -> Postgres (author-only)
Browser -> tRPC tavern.reportMessage(messageId)       -> Postgres (txn: insert + increment)
```

- `useQuery` with `refetchInterval: 15_000`, `refetchIntervalInBackground: false`.
- `Refresh` invalidates the query.
- Mutations invalidate on success; sending also scrolls to bottom.
- "Load older" fetches the next 50 via cursor `(createdAt, id)`.

Phase 2 (managed realtime — Ably/Pusher) and Phase 3 (native WebSocket) are deferred. Revisit when Tavern sees recurring daily use or Warfronts ship and demand a live ticker.

## Data model

Two tables. Both `@@map`-snake-cased, both cascade on user delete.

```prisma
model TavernMessage {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String                           // Better Auth ID — text, not UUID
  characterId String    @db.Uuid               // frozen at send for stable attribution
  content     String    @db.VarChar(500)
  createdAt   DateTime  @default(now()) @db.Timestamp(6)
  deletedAt   DateTime? @db.Timestamp(6)       // author-only soft delete
  reportCount Int       @default(0)            // auto-hide when >= 3

  @@index([createdAt, id])
  @@index([userId, createdAt])
  @@map("tavern_messages")
}

model TavernMessageReport {
  id         String   @id @default(uuid()) @db.Uuid
  messageId  String   @db.Uuid
  reporterId String
  reason     String?  @db.VarChar(255)         // nullable; v1 UI collects none
  createdAt  DateTime @default(now()) @db.Timestamp(6)

  @@unique([messageId, reporterId])
  @@index([messageId])
  @@map("tavern_message_reports")
}
```

`characterId` is frozen at send time so renamed or deleted characters still attribute correctly in scrollback. No `kind` column in v1 — there is no SYSTEM message producer until Warfronts ship.

The `getMessages` query filters `deletedAt IS NULL AND reportCount < 3`. Hidden rows are kept for future moderation review.

## Service / router map

| Surface         | File                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------ |
| Schema          | `prisma/schema.prisma`                                                                     |
| Zod schemas     | `src/shared/schemas/tavern.schemas.ts`                                                     |
| Repository      | `src/server/repositories/tavern-message.repository.ts`                                     |
| Service         | `src/server/services/tavern.service.ts`                                                    |
| Service factory | `src/server/services/service.factory.ts`                                                   |
| Router          | `src/server/routers/tavern.router.ts`                                                      |
| Page            | `src/app/(workspace)/tavern/page.tsx`                                                      |
| Components      | `src/app/(workspace)/tavern/_components/tavern-{room,message-list,composer}.component.tsx` |
| Sidebar         | `src/components/common/app-sidebar.component.tsx`                                          |
| Route grouping  | `src/app/(workspace)/layout.tsx` (`RPG_ROUTES`)                                            |
| Rate limit      | `src/server/trpc.ts` (`RATE_LIMITS.chat`)                                                  |
| i18n            | `public/locales/{en,es}/translation.json` under `tavern.*`                                 |
| Tests           | `src/server/__tests__/services/tavern.service.test.ts`                                     |

Router shape:

```ts
tavern.getMessages({ cursor?: { createdAt: string; id: string }, limit?: number })
tavern.sendMessage({ content: string })           // rateLimit(RATE_LIMITS.chat)
tavern.deleteMessage({ id: string })              // author-only
tavern.reportMessage({ messageId: string })       // one per (messageId, reporterId)
```

`deleteMessage` and `reportMessage` also carry `rateLimit(RATE_LIMITS.write)` as a defensive guard.

## Non-goals (v1)

| Item                            | Why deferred                                                  |
| ------------------------------- | ------------------------------------------------------------- |
| DMs                             | Large safety/abuse surface.                                   |
| Attachments / images            | Requires upload moderation.                                   |
| Rich embeds / link unfurls      | Phishing and moderation risk.                                 |
| Multiple channels               | Premature before volume exists.                               |
| User-created channels           | Moderation and discoverability cost.                          |
| SYSTEM messages                 | No v1 producer; reintroduces with Warfronts.                  |
| Admin / moderator role          | No role model in DB; reports + auto-hide are enough for beta. |
| Blocked-terms list              | False-positive heavy; add only after a real incident.         |
| Global slow mode                | Kill-switch env var is enough for incidents.                  |
| URL detection / stripping       | Plain-text rendering already removes XSS / click risk.        |
| Presence / online count         | Approximations are misleading at low concurrent counts.       |
| Right rail                      | Empty in v1 (Warfronts split out).                            |
| Tavern Inn / rest mode          | Not native to Covenant mechanics.                             |
| Direct task / habit boss damage | Bypasses Covenant's mana / combat loop.                       |

## Risks

- **Moderation overrun** — even a small global chat has higher abuse risk than a notice board. Mitigated by rate limit, reports, auto-hide, no uploads, `TAVERN_DISABLED=1` kill-switch.
- **Chat feels stale** — 15 s poll can feel slow with multiple active users. Mitigated by Last-updated label, Refresh button, send-then-refetch, "New messages" affordance.
- **Premature realtime spend** — do not migrate transport until usage justifies it.
- **Chat without Warfronts feels idle** — v1 leans on player-authored content only. If engagement is low, Warfronts (planned content engine) are the answer, not realtime.

## Cross-references

- `docs/specs/warfronts.md` — shared world objectives; will reintroduce SYSTEM messages into the Tavern.
- `docs/product/guild_system.md` — adjacent private social surface; Forum component is the pattern reference.
- `docs/product/quest_system.md` — productivity → mana → combat loop that the Tavern stays out of.
- `docs/specs/freemium_model.md` — Tavern remains free in v1.
- `CONTEXT.md` — RPG-views set (Tavern joins it).
- `AGENTS.md` — rate-limit infra, Better Auth ID types, `protectedProcedure`.
