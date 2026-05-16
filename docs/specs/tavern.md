# Tavern

> **Version**: 0.2 (draft)
> **Status**: Proposed
> **Last Updated**: 2026-05-16
> **Source**: product review of Habitica feedback, Covenant's current mana/quest loop, and the deleted `MapActivity` / `ActivityParticipation` system documented in `docs/product/quest_system.md`.

## Summary

The **Tavern** is Covenant's global chat: the account-wide common room where all players can see that the world is alive, talk across guild boundaries, react to live events, and receive system calls-to-arms.

**Warfronts** are the adjacent shared-world system that the Tavern can announce, discuss, and deep-link into.

## Product thesis

Covenant's core loop is:

```text
real work -> mana/reserve -> combat/quests -> character/world progress
```

Shared-world progression should come from **combat and quest outcomes powered by productivity**, not from productivity events themselves.

The Tavern's job is social presence. It should make users feel like other players exist in the same war, without becoming Discord, DMs, or a moderation sink.

## Goals

1. Provide one official, global, in-app chat surface named **Tavern**.
2. Support real-time conversation without short polling or long polling.
3. Keep moderation and safety bounded for a solo-dev beta.
4. Let Warfront events surface inside chat as system messages without making chat responsible for game mechanics.
5. Preserve Covenant's native loop: objectives/tasks/habits grant mana; quests/combat affect shared objectives and lore development.

## Non-goals

- Recreate Discord with channels, voice, DMs, file uploads, bots, and rich embeds.
- Add Habitica-style task/habit damage to bosses.
- Add Habitica-style rest mode to Tavern.
- Replace Guild Forums. Guilds remain private, group-scoped discussion.
- Support anonymous posting. Authenticated users only.
- Support user-uploaded images or attachments in v1.

## State today

- Guilds have a polling-based Forum (`docs/product/guild_system.md`) scoped to private groups.
- No global chat exists.
- Quest system replaced the old shared `MapActivity` / `ActivityParticipation` model with per-character quests (`docs/product/quest_system.md`).
- Productivity completions grant mana/reserve and feed some guild progression hooks; they are not a direct combat-damage source.
- No WebSocket or managed realtime provider is currently in the architecture.

## Phase 1 — Tavern global chat

### Experience

`/tavern` opens a single global chat room with:

- Persistent message history.
- Live message delivery.
- Online/presence count.
- System notices for Warfronts, deployments, seasonal events, and moderation announcements.
- Report and delete flows.
- Slow-mode/rate-limit affordance.

### Chat rules

- Authenticated users only.
- One global channel in v1: `tavern:global`.
- Plain text only.
- 500-character message cap.
- No DMs.
- No images, uploads, or link unfurls.
- Links may be allowed as plain text later; default v1 posture is to reject or neutralize URLs.
- Server-side rate limits:
  - per-user burst limit, e.g. 5 messages / 30s
  - per-IP burst limit
  - optional global slow mode during incidents
- Moderation:
  - report button on each message
  - auto-hide after threshold, e.g. 3 unique reports
  - author/officer/admin delete depending on future role model; v1 can use admin-only deletion
  - environment-managed blocked terms list

### UI

- `/tavern` lives under the RPG route group.
- Sidebar entry: `Tavern` in RPG, under `Guilds`.
- Main layout:
  - message stream
  - composer docked at bottom
  - right rail for active Warfronts and user count
  - system messages styled distinctly from player messages
- Empty state: _"The fire is lit. The ale is flowing. The room is waiting for its first rumor."_

---

## Realtime transport analysis

The Tavern should not use short polling or long polling. It should use WebSockets directly or a managed realtime provider that maintains WebSocket connections for us.

### Option A — Native WebSocket service on Railway

Run a separate long-lived realtime service next to the Next.js app.

```text
Browser -> WebSocket -> realtime service -> Postgres
                                |
                                -> Redis pub/sub if horizontally scaled

Browser -> tRPC/HTTP -> Next.js app -> Postgres
```

Implementation shape:

- New Railway service, e.g. `apps/realtime` or `src/server/realtime`.
- Use `ws` or Socket.IO.
- Browser connects to `wss://realtime.covenant.../tavern`.
- The realtime service validates the Better Auth session via signed cookie, token exchange, or an internal auth endpoint.
- On message:
  1. validate auth and rate limits
  2. persist `TavernMessage` in Postgres
  3. broadcast sanitized message to connected clients
- If multiple realtime instances run, add Redis pub/sub so all clients receive messages no matter which instance they are connected to.

Pros:

- Full control.
- No vendor lock-in.
- Lowest per-message vendor cost at scale.
- Easy to share the same Postgres schema and internal domain rules.

Cons:

- More infrastructure and production responsibility.
- Need connection lifecycle, heartbeats, reconnection, fanout, backpressure, and abuse handling.
- Horizontal scaling requires Redis or equivalent.
- Must be careful with Next.js deployment shape; WebSockets need a long-lived server, not a serverless route handler.

Recommendation if chosen:

- Do **not** embed WebSocket handling in normal tRPC or Next route handlers.
- Use a dedicated Railway service with clear ownership and healthchecks.
- Start single-instance for beta; add Redis only when scaling requires it.

### Option B — Managed realtime provider: Ably or Pusher Channels

Use a hosted realtime network for WebSocket fanout while Covenant keeps message persistence and moderation logic.

```text
Browser -> tRPC sendMessage -> Next.js -> Postgres -> provider.publish("tavern:global")
Browser -> provider WebSocket subscription -> live messages
```

Implementation shape:

- Client subscribes to private/presence channel `tavern:global`.
- App exposes an auth endpoint that signs the provider subscription for logged-in users.
- Message creation still goes through Covenant's tRPC mutation; clients do not write directly to the provider.
- After storing the message, the server publishes the sanitized payload.

Pros:

- Fastest reliable path to real chat.
- Handles WebSocket infrastructure, reconnects, presence, fanout, and cross-region delivery.
- Avoids running a custom realtime service in early beta.
- Lets the app stay mostly within current Next.js/tRPC architecture.

Cons:

- Vendor dependency.
- Monthly cost grows with connections/messages.
- Provider-specific auth and event semantics.
- Message history should still live in Covenant's Postgres, not only in provider history.

Recommendation:

- **Best v1 choice for a solo-dev beta.**
- Prefer this if the goal is to validate whether global chat is valuable before owning realtime infrastructure.
- Evaluate Ably vs Pusher primarily on pricing, auth ergonomics, presence support, and message-volume limits.

### Option C — Supabase Realtime

Supabase Realtime provides Broadcast, Presence, and Postgres Changes over WebSockets.

Pros:

- Good fit if Covenant were already on Supabase Postgres/Auth.
- Broadcast and Presence map naturally to chat and online count.
- Can be self-hosted, but that becomes infrastructure work.

Cons:

- Covenant currently uses Prisma/Postgres and Better Auth, not Supabase as the system of record.
- Adding Supabase only for realtime creates another auth and infrastructure plane.
- Postgres change streaming is not the ideal primitive for moderated chat fanout; server-published broadcast is cleaner.

Recommendation:

- Not the default choice unless the product is already moving toward Supabase.

### Option D — PartyKit / durable room service

Use a room-oriented WebSocket runtime for realtime collaboration/chat.

Pros:

- Clean room abstraction.
- Good developer experience for multiplayer/presence-style features.
- Could also support live Warfront tickers.

Cons:

- Still an additional runtime/provider.
- Covenant must integrate auth, persistence, moderation, and replay.
- Less standard for plain SaaS chat than Ably/Pusher-style pub/sub.

Recommendation:

- Interesting if Covenant later adds richer live shared-world scenes. For v1 Tavern chat, managed pub/sub is simpler.

### Transport recommendation

Use **managed realtime pub/sub for v1**:

1. Persist messages through tRPC in Covenant.
2. Publish sanitized events to a private/presence channel.
3. Subscribe from the client over the provider WebSocket.
4. Fetch recent history from tRPC on page load.
5. Use provider presence only for lightweight online count, not durable state.

This gives real chat without owning WebSocket ops, while keeping moderation, persistence, and product rules in Covenant.

### Infrastructure decision: Railway vs GCP

Managed realtime pub/sub does **not** require migrating the whole app to GCP first. If Ably/Pusher-style infrastructure owns the browser WebSocket connections, Covenant only needs:

- normal HTTP/tRPC mutations for message creation
- provider auth/signing endpoints
- server-side publish calls
- Postgres persistence

That fits Railway well and keeps the beta infrastructure small.

GCP becomes more attractive if Covenant decides to own the realtime layer:

- **Cloud Run** supports WebSockets, but WebSocket streams are still request-scoped and must handle request timeouts, reconnects, and instance synchronization.
- **Memorystore for Redis** can provide managed Redis for Socket.IO adapters or pub/sub fanout.
- **Cloud Pub/Sub** can help with backend event distribution, though it is not a browser WebSocket service by itself.
- **Firebase Realtime Database / Firestore listeners** are options if Covenant wants a Firebase-shaped realtime stack, but that would introduce another data/auth model beside Prisma/Postgres and Better Auth.

Recommendation:

- Stay on Railway for Tavern v1 if using managed realtime pub/sub.
- Do not migrate infrastructure only for chat validation.
- Revisit GCP when one of these becomes true:
  - Covenant wants to self-host WebSockets.
  - Warfronts need higher-volume event streaming, analytics, or background processing.
  - The app needs multiple managed primitives together: Cloud Run, Pub/Sub, Redis, scheduled jobs, log sinks, BigQuery, etc.
  - Railway's WebSocket connection limits or scaling model become a measured bottleneck.

---

## Data model

```prisma
model TavernMessage {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String
  characterId String?   @db.Uuid
  content     String    @db.VarChar(500)
  kind        String    @default("USER") @db.VarChar(32) // USER | SYSTEM
  createdAt   DateTime  @default(now()) @db.Timestamp(6)
  deletedAt   DateTime? @db.Timestamp(6)
  reportCount Int       @default(0)

  @@index([createdAt])
  @@index([userId, createdAt])
  @@map("tavern_messages")
}

model TavernMessageReport {
  id         String   @id @default(uuid()) @db.Uuid
  messageId  String   @db.Uuid
  reporterId String
  reason     String?  @db.VarChar(255)
  createdAt  DateTime @default(now()) @db.Timestamp(6)

  @@unique([messageId, reporterId])
  @@index([messageId])
  @@map("tavern_message_reports")
}
```

Optional later:

- `TavernMute` for per-user temporary moderation.
- `TavernChannel` if global chat later splits into official channels.
- `TavernPresenceSnapshot` only if live presence needs analytics; v1 should avoid durable presence state.

## Service / router map

| Surface                  | File                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Schema                   | `prisma/schema.prisma`                                                             |
| Zod schemas              | `src/shared/schemas/tavern.schemas.ts`                                             |
| Repository               | `src/server/repositories/tavern-message.repository.ts`                             |
| Service                  | `src/server/services/tavern.service.ts`                                            |
| Service factory          | `src/server/services/service.factory.ts`                                           |
| Router                   | `src/server/routers/tavern.router.ts`                                              |
| Realtime publish adapter | `src/server/realtime/tavern-publisher.ts`                                          |
| Provider auth endpoint   | `src/app/api/realtime/auth/route.ts`                                               |
| Page                     | `src/app/(workspace)/tavern/page.tsx`                                              |
| Components               | `src/app/(workspace)/tavern/_components/{message-list,composer,warfront-rail}.tsx` |
| i18n                     | `public/locales/{en,es}/translation.json` under `tavern.*`                         |
| Tests                    | `src/server/__tests__/services/tavern.service.test.ts`                             |

---

## Warfronts

The old activities system may be more interesting than a single "World Boss" mechanic because it can create world-scale stakes without forcing every event into a monster HP bar. The new product name for that shared objective layer is **Warfronts**.

`docs/product/quest_system.md` says the current Quest system replaced:

- `MapActivity`
- `ActivityParticipation`
- `ActivityService`
- `DeadlineService`
- `src/shared/constants/activities.ts`
- `/map/activity/[id]/page.tsx`

That old model had an important product idea: **global timed objectives where contribution stacks up and the result affects lore and rewards**.

Example:

```text
Defeat 100 demons before Sunday.
If the community succeeds, the northern road is secured and a reward unlocks.
If the community fails, the demons overrun the pass and the next lore beat changes.
```

### Is this more interesting than the current Quest system?

It is more interesting for **shared world stakes**, but not a replacement for quests.

| System                    | Strong at                                                                                                    | Weak at                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Current Quests**        | Personal combat depth, character progression, controlled difficulty, deterministic individual play sessions. | Can feel isolated; does not make the world feel collectively changed.                                                              |
| **Warfronts**             | Shared goals, deadlines, community stakes, lore consequences, "we did this together" moments.                | Can become shallow progress bars if detached from combat; harder to balance for low/high population; less personal tactical depth. |

Recommendation:

- Keep quests as the core individual combat loop.
- Reintroduce the old activities idea as **Warfronts**, a meta-layer above quests, not instead of quests.
- Treat "World Boss" as one possible `Warfront` objective type.

### Covenant-native contribution rule

Warfronts should receive contribution from combat/quest outcomes, not raw productivity events.

```text
tasks/habits/objectives/journaling -> mana/reserve
mana/reserve -> more quest/combat capacity
quest/combat outcomes -> Warfront contribution
Warfront result -> lore + rewards
```

Valid contribution events:

- enemy defeated in a quest
- quest completed
- boss encounter won
- item recovered
- position defended
- faction objective advanced

Invalid contribution events:

- task completed directly
- habit completed directly
- journal entry created directly
- objective completed directly

Those events already matter because they grant mana. They should not also bypass combat.

### Warfront model sketch

```prisma
model Warfront {
  id              String   @id @default(uuid()) @db.Uuid
  templateId      String   @db.VarChar(64)
  name            String   @db.VarChar(120)
  type            String   @db.VarChar(32) // INCURSION | WORLD_BOSS | DEFENSE | EXPEDITION | VOTE
  objectiveType   String   @db.VarChar(32) // KILL_ENEMIES | COMPLETE_QUESTS | DEFEAT_BOSS | GATHER_ITEMS
  target          Int
  progress        Int      @default(0)
  startsAt        DateTime @default(now()) @db.Timestamp(6)
  deadlineAt      DateTime @db.Timestamp(6)
  resolvedAt      DateTime? @db.Timestamp(6)
  outcome         String?  @db.VarChar(32) // SUCCESS | FAILURE
  rewardPool      Json
  loreSuccess     String   @db.Text
  loreFailure     String   @db.Text

  @@index([resolvedAt, deadlineAt])
  @@map("warfronts")
}

model WarfrontContribution {
  id          String   @id @default(uuid()) @db.Uuid
  warfrontId  String   @db.Uuid
  userId      String
  guildId     String?  @db.Uuid
  amount      Int      @default(0)
  eventsLogged Int     @default(0)
  rewardClaimed DateTime? @db.Timestamp(6)
  updatedAt   DateTime @updatedAt @db.Timestamp(6)

  @@unique([warfrontId, userId])
  @@index([warfrontId])
  @@index([guildId])
  @@map("warfront_contributions")
}
```

### Warfront types

| Type         | Example                                               | Contribution source                            |
| ------------ | ----------------------------------------------------- | ---------------------------------------------- |
| `INCURSION`  | "Defeat 100 demons before the bell tolls."            | Enemy kills from quests.                       |
| `WORLD_BOSS` | "Break the siege engine before it reaches the walls." | Boss/elite encounter victories.                |
| `DEFENSE`    | "Hold the Silver Gate for 72 hours."                  | Quest completions or defense encounters.       |
| `EXPEDITION` | "Recover 500 relic fragments from the ruins."         | Quest item drops.                              |
| `VOTE`       | "Choose which front receives reinforcements."         | Explicit user choice, not productivity/combat. |

### Tavern integration

The Tavern should surface Warfronts as social prompts:

- pinned system banner: active Warfront, deadline, progress
- system message when a Warfront starts, hits milestones, succeeds, or fails
- chat deep-links to Warfront page
- right rail showing active Warfront and guild contribution totals

The Warfront itself should live on its own route, e.g. `/warfronts/[id]`, or under `/quests/warfronts/[id]` if it becomes tightly coupled to quests.

---

## Naming pass: replacing "World Boss"

"World Boss" is clear but generic and MMO-shaped. Covenant's tone is solemn, mystical, and warlike. Better labels should feel like events in a dark religious war rather than borrowed RPG terminology.

### Feature names

| Name          | Use when                                               | Notes                                                                                      |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **Incursion** | A hostile force crosses into the world.                | Best default. Flexible enough for demons, cults, plagues, siege engines, and named bosses. |
| **Warfront**  | Multiple guilds/factions are pushing a strategic line. | Chosen system name for shared global objectives.                                           |
| **Omen**      | A mystical timed threat appears.                       | Strong lore flavor, less explicitly combat.                                                |
| **Siege**     | The objective is defense or attrition.                 | Good for city/gate/fortress events.                                                        |
| **Crusade**   | Players are collectively attacking a target.           | Strong Covenant tone, but may be faction-specific.                                         |
| **Calamity**  | A rare server-wide event with major consequences.      | Best for high-drama seasonal events.                                                       |

Recommendation:

- Use **Warfront** as the system and player-facing term for shared global objectives.
- Use **Incursion** as a Warfront subtype for hostile timed attacks.
- Reserve **Calamity** for rare, high-stakes global events.

### Specific boss/event names

| Name                       | Flavor                                               |
| -------------------------- | ---------------------------------------------------- |
| **The Hollow Seraph**      | Fallen holy imagery; strong Covenant fit.            |
| **The Black Tithe**        | A demon/curse that consumes tribute and progress.    |
| **The Gate-Eater**         | Direct, memorable siege monster.                     |
| **The Choir of Ash**       | Collective enemy; works as a boss or horde activity. |
| **The Ninth Apostate**     | Religious-war tone, named antagonist energy.         |
| **The Red Ledger**         | Productivity/accounting motif twisted into horror.   |
| **The Wound Beneath**      | Mystical terrain/entity, good for lore consequences. |
| **The Saintless Colossus** | Boss-shaped without saying boss.                     |
| **The Carrion Host**       | Horde/incursion activity, not single boss.           |
| **The Bell That Bleeds**   | Omen/calamity, strong visual hook.                   |

Example Warfront titles:

- **Incursion: The Gate-Eater**
- **Siege of the Silver Gate**
- **Calamity: The Bell That Bleeds**
- **Warfront: Ash on the Northern Road**
- **Omen: The Hollow Seraph Descends**

---

## Open design questions

- **Provider vs native WebSocket service**: recommended v1 is managed realtime pub/sub; revisit native service after chat proves retention value.
- **Global chat volume**: one channel is simplest. Split only after volume makes one stream unusable.
- **Moderation role model**: v1 can be admin-only; later guild officers or trusted community roles may help.
- **Warfront route**: should Warfronts live under `/warfronts`, `/quests`, or a future world-map surface?
- **Lore consequences**: should failed Warfronts change only flavor text, or can they temporarily alter shop inventory, enemy pools, or faction bonuses?

## Items deliberately deferred

| Item                             | Why deferred                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| DMs                              | Large safety and abuse surface.                                                                   |
| Attachments/images               | Requires upload moderation.                                                                       |
| Rich embeds/link unfurls         | Phishing and moderation risk.                                                                     |
| Multiple channels                | Premature before volume exists.                                                                   |
| User-created channels            | Moderation and discoverability cost.                                                              |
| Tavern Inn/rest mode             | Not native to current Covenant mechanics.                                                         |
| Direct task/habit boss damage    | Copies Habitica and bypasses Covenant's mana/combat loop.                                         |
| Replacing quests with Warfronts | Warfronts should complement quests as shared-world meta, not remove personal combat progression. |

## Risks

- **Moderation overrun**: real chat has higher risk than a notice board. Mitigate with caps, reports, auto-hide, no uploads, blocked terms, and admin tooling before broad launch.
- **Realtime vendor lock-in**: abstract provider publish/auth behind `tavern-publisher.ts`; keep message history in Postgres.
- **Native WebSocket ops burden**: if self-hosted too early, connection management can distract from product validation.
- **Chat without Warfronts becomes idle noise**: system messages and Warfront prompts should give the room a reason to exist beyond chatter.
- **Warfronts become progress bars**: contribution must come from satisfying quest/combat actions and resolve into real lore/reward outcomes.

## Cross-references

- `docs/product/quest_system.md` — current quests and deleted `MapActivity` / `ActivityParticipation` lineage.
- `docs/product/guild_system.md` — adjacent private social surface; Tavern is global and public.
- `docs/specs/freemium_model.md` — Tavern chat should remain free in v1.
- `docs/habitica_feedback.md` — source feedback on lost social spaces and world bosses, but Covenant should not copy Habitica's task-damage loop.
- Vercel WebSocket guidance — serverless route handlers are not the right place for durable WebSocket chat.
- Ably / Pusher / Supabase Realtime docs — managed realtime options for WebSocket-based pub/sub, presence, and broadcast.
