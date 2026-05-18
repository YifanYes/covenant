# Warfronts

> **Version**: 0.1 (draft, extracted from `docs/product/tavern.md` v0.2)
> **Status**: Proposed
> **Last Updated**: 2026-05-16
> **Source**: revival of the deleted `MapActivity` / `ActivityParticipation` system documented in `docs/product/quest_system.md`, framed for Covenant's mana/quest loop.

## Summary

**Warfronts** are shared, time-bounded world objectives. Contribution comes from satisfying quest/combat events powered by mana, not from raw productivity completions. Outcomes change lore and reward pools.

Warfronts are adjacent to — and announced by — the [Tavern](../product/tavern.md), but do not depend on it.

## Product thesis

The old `MapActivity` / `ActivityParticipation` model had one important idea: **global timed objectives where contribution stacks up and the result affects lore and rewards**.

```text
Defeat 100 demons before Sunday.
If the community succeeds, the northern road is secured and a reward unlocks.
If the community fails, the demons overrun the pass and the next lore beat changes.
```

Quests give personal combat depth. Warfronts give shared world stakes. They are complementary, not substitutes.

| System              | Strong at                                                                                                    | Weak at                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Current Quests**  | Personal combat depth, character progression, controlled difficulty, deterministic individual play sessions. | Can feel isolated; does not make the world feel collectively changed.                                                              |
| **Warfronts**       | Shared goals, deadlines, community stakes, lore consequences, "we did this together" moments.                | Can become shallow progress bars if detached from combat; harder to balance for low/high population; less personal tactical depth. |

Recommendation:

- Keep quests as the core individual combat loop.
- Reintroduce the old activities idea as **Warfronts**, a meta-layer above quests.
- Treat "World Boss" as one possible Warfront subtype.

## Goals

1. Provide shared, time-bounded objectives that contribute to lore outcomes.
2. Source contribution only from quest/combat events (which already cost mana).
3. Keep the v1 footprint small: one active Warfront at a time, manual scheduling.
4. Surface Warfront state in the Tavern as system messages without coupling Tavern to Warfront mechanics.

## Non-goals

- Replace quests with Warfronts.
- Direct task/habit/objective/journal contribution (those events already grant mana — they must not also bypass combat).
- User-created Warfronts in v1.
- Faction-vs-faction PvP in v1.

## Covenant-native contribution rule

```text
tasks / habits / objectives / journaling -> mana / reserve
mana / reserve                            -> more quest / combat capacity
quest / combat outcomes                   -> Warfront contribution
Warfront result                           -> lore + rewards
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

## Warfront types

| Type         | Example                                               | Contribution source                            |
| ------------ | ----------------------------------------------------- | ---------------------------------------------- |
| `INCURSION`  | "Defeat 100 demons before the bell tolls."            | Enemy kills from quests.                       |
| `WORLD_BOSS` | "Break the siege engine before it reaches the walls." | Boss/elite encounter victories.                |
| `DEFENSE`    | "Hold the Silver Gate for 72 hours."                  | Quest completions or defense encounters.       |
| `EXPEDITION` | "Recover 500 relic fragments from the ruins."         | Quest item drops.                              |
| `VOTE`       | "Choose which front receives reinforcements."         | Explicit user choice, not productivity/combat. |

## Data model

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
  id           String   @id @default(uuid()) @db.Uuid
  warfrontId   String   @db.Uuid
  userId       String
  guildId      String?  @db.Uuid
  amount       Int      @default(0)
  eventsLogged Int      @default(0)
  rewardClaimed DateTime? @db.Timestamp(6)
  updatedAt    DateTime @updatedAt @db.Timestamp(6)

  @@unique([warfrontId, userId])
  @@index([warfrontId])
  @@index([guildId])
  @@map("warfront_contributions")
}
```

## Tavern integration

Warfront state surfaces in the Tavern as system messages (reintroduces the `TavernMessage.kind` column deferred in `docs/product/tavern.md` v1). Tavern does not own Warfront mechanics; it only renders the announcements.

- pinned system banner: active Warfront, deadline, progress
- system message when a Warfront starts, hits milestones, succeeds, or fails
- chat deep-links to Warfront page
- right rail: active Warfront summary, guild contribution totals

The Warfront itself lives on its own route: `/warfronts/[id]` (or `/quests/warfronts/[id]` if it becomes tightly coupled to quests — open question).

## Naming pass: replacing "World Boss"

"World Boss" is clear but generic and MMO-shaped. Covenant's tone is solemn, mystical, warlike. Better labels should feel like events in a dark religious war.

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

## Open design questions

- **Route**: `/warfronts/[id]` or `/quests/warfronts/[id]`?
- **Lore consequences**: only flavor text, or also temporary shop inventory / enemy pools / faction bonuses?
- **Scheduling**: who creates a Warfront in v1 — manual SQL seeding, cron from a template table, or a small admin endpoint? Depends on the admin-role question deferred in `docs/product/tavern.md`.
- **Resolution**: cron job that flips `resolvedAt` + computes `outcome` from `progress >= target` at `deadlineAt`. Needs `node-cron` registration alongside existing scheduled jobs.
- **Reward distribution**: lazy ("claim on visit") or eager (push at resolution)? Lazy is simpler.
- **Contribution weighting**: minion vs elite vs boss should not all count as `1`. Use a weight table (`kind -> amount`) or scale by enemy HP.

## Cross-references

- [Tavern](../product/tavern.md) — announcement surface for Warfront events.
- `docs/product/quest_system.md` — quests + deleted `MapActivity` lineage.
- `docs/product/guild_system.md` — guild-scoped contribution rollup.
- `CONTEXT.md` — Quest, Encounter, Mana, Reserve definitions.
