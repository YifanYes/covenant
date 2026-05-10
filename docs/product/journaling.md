# Journaling MVP Specification

## Overview

Validation-first daily journaling. Plain-text entries (~5 min), optional mood tracking, monthly calendar view. We ship the smallest possible version to prove users will write daily — then let data decide what to expand.

## Validation Hypothesis

If users can write a quick entry and see their mood patterns on a calendar, a meaningful subset will form a daily habit. We will know this is true if:

- **30% activation**: of users who open `/journaling`, at least 30% create an entry within 7 days
- **25% 7-day retention**: of users who write once, at least 25% write again within 7 days
- **40% mood adoption**: at least 40% of entries include a mood

If we miss these thresholds, we iterate on discovery (onboarding tooltip, daily reminder) or cut scope further before building reviews, time capsules, or AI insights.

## What's In (MVP)

- **Write tab**: auto-resizing `<textarea>`, optional mood picker, "Need a prompt?" button, save for today
- **History**: paginated list of recent entries below the editor
- **Calendar tab**: monthly grid colored by mood; gray = no entry; click a day to view it
- **Reward**: 1 dice per calendar day; streak counter shown for motivation only

## What's Out (Deferred)

| Feature | Deferred Until |
|---|---|
| Markdown editor | Users explicitly ask for formatting |
| Reviews (weekly/monthly/annual) | 7-day retention > 25% |
| Time capsule | Users have 30+ entries and retention is flat |
| Mood mosaic / yearly view / share | 6+ months of data and users ask for it |
| Habit calendar overlay | Separate feature, not core to journaling hypothesis |
| Search | Users have 50+ entries and complain about finding old ones |
| Streak dice bonuses | Streaks correlate with retention in the data |
| Full prompt catalog (40) | Start with 5 generic prompts; expand if prompt usage > 15% |

## Mood Tracking

Keep all 12 moods — the data is cheap and the signal is valuable.

| Mood ID | Emoji | Color | EN | ES |
|---|---|---|---|---|
| `happy` | 😊 | `#FFD700` | Happy | Feliz |
| `sad` | 😢 | `#4682B4` | Sad | Triste |
| `angry` | 😠 | `#DC143C` | Angry | Enfadado |
| `disappointed` | 😞 | `#8B7D6B` | Disappointed | Decepcionado |
| `focused` | 🎯 | `#228B22` | Focused | Concentrado |
| `hopeful` | 🌟 | `#FF8C00` | Hopeful | Esperanzado |
| `depressed` | 😔 | `#483D8B` | Depressed | Deprimido |
| `calm` | 😌 | `#5F9EA0` | Calm | Tranquilo |
| `anxious` | 😰 | `#B22222` | Anxious | Ansioso |
| `excited` | 🤩 | `#FF4500` | Excited | Emocionado |
| `grateful` | 🙏 | `#DAA520` | Grateful | Agradecido |
| `tired` | 😴 | `#708090` | Tired | Cansado |

Stored in `src/shared/constants/journal.constants.ts`.

## Prompts

Five generic prompts. No categories, no localStorage dedup — just random selection.

1. "What are three things you're grateful for today?"
2. "What moment from today will you remember most?"
3. "What was the hardest part of your day?"
4. "What are you looking forward to tomorrow?"
5. "How are you feeling right now?"

i18n keys: `journaling.prompt.0` through `journaling.prompt.4`.

## Dice Rewards

- 1 dice per calendar day (idempotent — saving twice on the same day does not grant extra dice)
- Streak counter displayed next to the save button for motivation
- **No streak bonuses in MVP** — add them only if streak length correlates with 7-day retention

## Database

```prisma
model JournalEntry {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String
  content   String   @db.Text
  mood      String?  @db.VarChar(20)
  createdAt DateTime @default(now()) @db.Timestamp(6)
  updatedAt DateTime @updatedAt @db.Timestamp(6)
  deletedAt DateTime? @db.Timestamp(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("journal_entries")
}
```

Also add `journalEntries JournalEntry[]` to `User`.

Key decisions:
- `mood` is nullable varchar (not a Prisma enum) to avoid migrations when adding moods
- Soft delete via `deletedAt`
- No `type`, `lastCapsuleViewedAt`, or other review/capsule fields in MVP

## API (tRPC)

```typescript
export const journalingRouter = t.router({
  create: protectedProcedure.use(rateLimit(RATE_LIMITS.write))
    .input(createJournalEntrySchema).mutation(...),
  update: protectedProcedure.use(rateLimit(RATE_LIMITS.write))
    .input(updateJournalEntrySchema).mutation(...),
  delete: protectedProcedure.use(rateLimit(RATE_LIMITS.strict))
    .input(journalEntryIdSchema).mutation(...),
  getById: protectedProcedure.input(journalEntryIdSchema).query(...),
  getByDate: protectedProcedure.input(journalDateSchema).query(...),
  getAll: protectedProcedure.input(journalListSchema).query(...),
  getMoodCalendar: protectedProcedure.input(journalMonthSchema).query(...),
  getStreak: protectedProcedure.query(...)
})
```

## Service Interface

```typescript
class JournalService {
  constructor(
    private journalRepository: JournalRepository,
    private diceService: DiceService
  )

  create(userId: string, input: CreateJournalEntryType): Promise<{
    entry: JournalEntry
    diceEarned: number
    streak: number
  }>
  update(userId: string, input: UpdateJournalEntryType): Promise<JournalEntry>
  delete(userId: string, id: string): Promise<void>
  getById(userId: string, id: string): Promise<JournalEntry>
  getByDate(userId: string, date: string): Promise<JournalEntry | null>
  getAll(userId: string, input: JournalListType): Promise<PaginatedResult<JournalEntry>>
  getMoodCalendar(userId: string, month: number, year: number): Promise<
    { date: string; mood: string | null }[]
  >
  getStreak(userId: string): Promise<{ streak: number; hasEntryToday: boolean }>
}
```

Streak calculation: reuse or generalize `DiceService.calculateHabitStreak()` to accept `Date[]`.

## Frontend

Page: `/journaling` inside `ProductivityLayout`, two tabs.

### Write Tab
- Auto-resizing `<textarea>` with placeholder "How was your day?"
- Mood selector: horizontal row of color + mood label buttons, single-select, optional
- "Need a prompt?" button → inserts one of 5 random prompts above the textarea
- Save button (creates or updates today's entry)
- Recent entries list below (last 7 days, paginated)

### Calendar Tab
- Monthly grid: days colored by mood hex, gray if no entry
- Prev/next month navigation
- Click a day → opens that day's entry in a read-only panel

### Navigation
Add to the productivity section of the sidebar with a writing-themed icon from `pixelarticons/react`.

## Files

### New

| File | Purpose |
|---|---|
| `src/shared/constants/journal.constants.ts` | Mood definitions + 5 prompts |
| `src/shared/schemas/journal.schemas.ts` | Zod schemas |
| `src/shared/types/journal.types.ts` | Inferred types |
| `src/server/repositories/journal.repository.ts` | Prisma queries |
| `src/server/services/journal.service.ts` | Business logic, streaks, dice |
| `src/server/routers/journal.router.ts` | tRPC endpoints |
| `src/server/__tests__/services/journal.service.test.ts` | Unit tests |
| `src/app/(workspace)/journaling/page.tsx` | Page shell with tabs |
| `src/app/(workspace)/journaling/_components/journal-editor.component.tsx` | Textarea + mood + prompt |
| `src/app/(workspace)/journaling/_components/mood-calendar.component.tsx` | Monthly mood grid |
| `src/app/(workspace)/journaling/_components/entry-list.component.tsx` | Recent entries |

### Modified

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `JournalEntry`, `User.journalEntries` |
| `src/server/services/service.factory.ts` | Register `JournalService` |
| `src/server/services/dice.service.ts` | Generalize streak calculation |
| `src/server/router.ts` | Register `journalingRouter` |
| `src/components/common/app-sidebar.component.tsx` | Sidebar link |
| `public/locales/en/translation.json` | i18n keys |
| `public/locales/es/translation.json` | i18n keys |

## Metrics & Events

Instrument these events in the client (PostHog or existing analytics):

| Event | Trigger | Target |
|---|---|---|
| `journaling_nav_clicked` | Click sidebar nav | — |
| `journal_entry_created` | Save first-ever entry | 30% of visitors |
| `journal_entry_updated` | Edit an existing entry | 20% of creators |
| `mood_selected` | Pick a mood | 40% of entries |
| `prompt_requested` | Click "Need a prompt?" | 15% of entries |
| `calendar_viewed` | Switch to Calendar tab | 50% of active users |
| `calendar_day_clicked` | Click a day in the grid | 20% of active users |

**Weekly SQL to run:**

```sql
-- Activation: % of users who discover the page and write within 7 days
SELECT 
  COUNT(DISTINCT user_id) FILTER (WHERE entry_count > 0) * 100.0
  / NULLIF(COUNT(DISTINCT user_id), 0)
FROM (
  SELECT user_id, COUNT(*) as entry_count
  FROM journal_entries
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY user_id
) x;

-- 7-day retention: of first-time writers, % who write again within 7 days
WITH first_entries AS (
  SELECT user_id, MIN(created_at)::date as first_date
  FROM journal_entries
  GROUP BY user_id
)
SELECT 
  first_date,
  COUNT(*) as cohort_size,
  COUNT(*) FILTER (WHERE second_date <= first_date + 7) * 100.0
  / COUNT(*) as retention_7d
FROM first_entries
LEFT JOIN LATERAL (
  SELECT MIN(created_at)::date as second_date
  FROM journal_entries j2
  WHERE j2.user_id = first_entries.user_id
    AND j2.created_at::date > first_entries.first_date
) second ON true
GROUP BY first_date;
```

## Implementation Phases

### Phase 1: Backend (2 days)
1. Add `JournalEntry` model to Prisma, run migration
2. Create constants, schemas, types
3. Implement `JournalRepository` + `JournalService`
4. Register service in factory, wire router, apply rate limits
5. Write unit tests

### Phase 2: Frontend (2 days)
1. Create page shell with 2 tabs
2. Build editor (textarea + mood + prompt + save)
3. Build entry list (recent 7, pagination)
4. Build mood calendar (monthly grid, prev/next)
5. Add sidebar link, i18n keys in both locales

### Phase 3: Instrumentation (1 day)
1. Add event logging calls on all key interactions
2. Verify events reach analytics backend
3. Document weekly query in Notion / Metabase

## Success Criteria (6-Week Runway)

After shipping, run for 4-6 weeks and decide:

| Metric | Target | If Missed |
|---|---|---|
| Activation (write ≥1 entry) | 30% of visitors | Fix discovery: onboarding tooltip, daily push |
| 7-day retention (of creators) | 25% write again within 7 days | Add time capsule or email reminder |
| Mood adoption | 40% of entries include mood | Cut to 5 moods or make required |
| Prompt usage | 15% of entries use prompt | Cut prompts, double down on freeform |
| Calendar engagement | 50% of active users view calendar | Cut calendar, focus on writing UX |

**Expansion gate**: only build reviews, streak bonuses, mood mosaic, or markdown editor if **both** activation > 30% and 7-day retention > 25%.

## Future Expansion (Gated on Metrics)

- **Reviews** (weekly/monthly/annual) — if 7-day retention > 25%
- **Time capsule** — if users have 30+ entries and retention flatlines
- **Mood mosaic + share** — if 6+ months of data and users ask for it
- **Markdown editor** — if users explicitly request formatting
- **Search + tags** — if users have 50+ entries and complain
- **AI insights** — if retention > 40% and 6+ months of mood data exists
