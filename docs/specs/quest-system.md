# Quest System Spec

## Overview

Replaces the `MapActivity`/`ActivityParticipation` shared-event system with individual character quests. Each character can have one active quest at a time. Quest templates live in code constants; instances are persisted in the `character_quests` table.

## Data Model

### `CharacterQuest` (replaces `ActivityParticipation` + `MapActivity`)

| Field                | Type     | Notes                             |
| -------------------- | -------- | --------------------------------- |
| id                   | UUID     | PK                                |
| characterId          | UUID     | FK → Character                    |
| questId              | VARCHAR  | Template ID from QUESTS constants |
| status               | VARCHAR  | ACTIVE / COMPLETED / ABANDONED    |
| progress             | Int      | Enemies killed so far             |
| target               | Int      | Enemies needed to complete        |
| goldEarned           | Int      | Gold accumulated                  |
| startedAt            | DateTime |                                   |
| completedAt          | DateTime | nullable                          |
| activeDoctrines      | Json     | Player doctrine state             |
| enemyActiveDoctrines | Json     | Enemy doctrine state              |
| combatStats          | Json     | Encounter pattern state           |
| tacticalState        | Json     | Full tactical combat snapshot     |

`CombatEnemy.participationId` → renamed to `characterQuestId`.

## Quest Templates

Defined in `src/shared/constants/quests.ts`. Current objective type is `KILL_ENEMIES`; the interface is designed for future types (`FIND_ITEM`, `PROTECT_NPC`, `DEFEND_POSITION`, `ATTACK_POSITION`).

## Frontend

- `/quests` — list available quest templates + character's active quest status
- `/quests/[questId]` — combat arena for the active quest (replaces `/map/activity/[id]`)

## Deleted

- `MapActivity` and `ActivityParticipation` DB models
- `ActivityRepository`, `ActivityParticipationRepository`
- `ActivityService`, `DeadlineService`
- `activity.router.ts`, `deadline.router.ts`
- `src/shared/constants/activities.ts`
- `/map/activity/[id]/page.tsx`
