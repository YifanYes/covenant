# Journaling Technical Specification

## Overview

A daily journaling system with a markdown editor, mood tracking, periodic reviews, and time capsule features. Users write short daily entries (~5 minutes), optionally select a mood, and earn dice rewards for consistency. The system includes weekly/monthly/annual review prompts, a mood calendar mosaic, and a time capsule that surfaces random past entries.

## Design Goals

1. **Reflection-oriented**: Encourage daily writing with minimal friction — a single text field and optional mood selector
2. **Mood-aware**: Track emotional patterns over time with a visual calendar and shareable yearly mosaic
3. **Gamification-aligned**: Reward journaling streaks with dice, following established streak/bonus patterns from habits
4. **Review-structured**: Scaffold weekly, monthly, and annual reviews with guided templates and server-enforced cooldowns
5. **Discovery-driven**: Surface random past entries via time capsule to encourage long-term engagement

## Mood Categories

12 emotion-based moods, each with an emoji, color, and i18n key:

| Mood ID        | Emoji | Color (hex) | EN Label     | ES Label     |
| -------------- | ----- | ----------- | ------------ | ------------ |
| `happy`        | 😊    | `#FFD700`   | Happy        | Feliz        |
| `sad`          | 😢    | `#4682B4`   | Sad          | Triste       |
| `angry`        | 😠    | `#DC143C`   | Angry        | Enfadado     |
| `disappointed` | 😞    | `#8B7D6B`   | Disappointed | Decepcionado |
| `focused`      | 🎯    | `#228B22`   | Focused      | Concentrado  |
| `hopeful`      | 🌟    | `#FF8C00`   | Hopeful      | Esperanzado  |
| `depressed`    | 😔    | `#483D8B`   | Depressed    | Deprimido    |
| `calm`         | 😌    | `#5F9EA0`   | Calm         | Tranquilo    |
| `anxious`      | 😰    | `#B22222`   | Anxious      | Ansioso      |
| `excited`      | 🤩    | `#FF4500`   | Excited      | Emocionado   |
| `grateful`     | 🙏    | `#DAA520`   | Grateful     | Agradecido   |
| `tired`        | 😴    | `#708090`   | Tired        | Cansado      |

Stored as a constant array in `shared/constants/journal.constants.ts`.

## Journal Prompts System

40 hardcoded prompts across 8 categories, stored as constants with i18n keys. When a user clicks "Give me a prompt", one is selected at random from a shuffled pool (no repeats until all seen, tracked client-side via localStorage).

### Prompt Categories (5 prompts each)

| Category        | Example Prompt (EN)                                           |
| --------------- | ------------------------------------------------------------- |
| `gratitude`     | "What are three things you're grateful for today?"            |
| `reflection`    | "What moment from today will you remember most?"              |
| `growth`        | "What skill or habit did you work on today?"                  |
| `challenges`    | "What was the hardest part of your day and how did you cope?" |
| `goals`         | "What is one step you took today toward a long-term goal?"    |
| `emotions`      | "What emotion dominated your day and why?"                    |
| `relationships` | "Who made an impact on your day and how?"                     |
| `creativity`    | "If today were a chapter in a book, what would the title be?" |

All 40 prompts are defined in `shared/constants/journal-prompts.constants.ts` with i18n keys following the pattern `journaling.prompts.<category>.<index>` (e.g., `journaling.prompts.gratitude.0`).

## Dice Reward System

Journaling integrates with the existing `DiceService` for gamification rewards.

### Entry Rewards

| Action              | Base Dice | Notes                            |
| ------------------- | --------- | -------------------------------- |
| Daily journal entry | 1         | One reward per calendar day      |
| Weekly review       | 2         | Server-enforced 7-day cooldown   |
| Monthly review      | 4         | Server-enforced 30-day cooldown  |
| Annual review       | 6         | Server-enforced 365-day cooldown |

### Streak Bonuses

Consecutive daily entries earn bonus dice, following the same threshold pattern as habits:

| Streak Length | Bonus Dice | Total per Entry |
| ------------- | ---------- | --------------- |
| < 7 days      | +0         | 1               |
| 7+ days       | +1         | 2               |
| 14+ days      | +2         | 3               |
| 21+ days      | +3         | 4               |

Streak is calculated from `JournalEntry.createdAt` dates (one entry per calendar day). A gap of more than 1 calendar day resets the streak.

Dice constants are added to `shared/constants/dice.constants.ts`:

```typescript
export const JOURNAL_DICE_REWARDS = {
  ENTRY_BASE: 1,
  REVIEW_WEEKLY: 2,
  REVIEW_MONTHLY: 4,
  REVIEW_ANNUAL: 6
}

export const JOURNAL_STREAK_THRESHOLDS = [
  { days: 21, bonus: 3 },
  { days: 14, bonus: 2 },
  { days: 7, bonus: 1 }
]
```

## Reviews System

Reviews are special journal entries with a `type` field (`weekly`, `monthly`, `annual`) and template scaffolding. They are manually triggered by the user (no auto-generation).

### Review Templates

Each review type pre-fills the markdown editor with a template:

**Weekly Review Template:**

```markdown
## Weekly Review

### What went well this week?

### What could have gone better?

### Key takeaway

### Focus for next week
```

**Monthly Review Template:**

```markdown
## Monthly Review

### Highlights of the month

### Challenges faced

### Progress on goals

### Mood patterns

### Adjustments for next month
```

**Annual Review Template:**

```markdown
## Annual Review

### Biggest achievements

### Biggest challenges

### What I learned

### How I grew as a person

### Goals for the next year

### One word to describe this year
```

Templates are stored as constants in `shared/constants/journal-templates.constants.ts` with i18n keys.

### Review Cooldowns

Server-enforced minimum intervals between reviews of the same type:

| Review Type | Cooldown | Validation                                           |
| ----------- | -------- | ---------------------------------------------------- |
| `weekly`    | 7 days   | Last weekly review `createdAt` must be 7+ days ago   |
| `monthly`   | 30 days  | Last monthly review `createdAt` must be 30+ days ago |
| `annual`    | 365 days | Last annual review `createdAt` must be 365+ days ago |

The service throws a `TRPCError` with code `TOO_MANY_REQUESTS` if the cooldown hasn't elapsed. The client disables the review button and shows the remaining cooldown time.

## Time Capsule

Surfaces a random past journal entry for the user to re-read. Designed to spark nostalgia and reflection.

### Rules

- Only entries **7+ days old** are eligible
- Excludes entries already viewed via time capsule in the **last 30 days** (tracked via `lastCapsuleViewedAt` field on the entry)
- If no eligible entries exist, the UI shows an empty state: "Keep journaling — your time capsule will unlock soon"
- One capsule fetch per page visit (not auto-refreshing)

### Implementation

The repository query:

```sql
WHERE userId = ? AND createdAt < NOW() - INTERVAL '7 days'
  AND (lastCapsuleViewedAt IS NULL OR lastCapsuleViewedAt < NOW() - INTERVAL '30 days')
ORDER BY RANDOM() LIMIT 1
```

When viewed, the entry's `lastCapsuleViewedAt` is updated to `NOW()`.

## Mood Calendar & Mosaic

### Mood Calendar (Monthly View)

A colored grid showing the mood for each day of the selected month. Each cell is colored by the mood's hex color. Days without entries are gray. Clicking a cell navigates to that day's entry.

### Mood Mosaic (Yearly View)

A 12×31 grid (months × days) showing the full year's mood pattern. Rendered client-side using an HTML `<canvas>` element for performance and easy export.

**Share feature**: A "Share" button renders the mosaic to a PNG via `canvas.toBlob()` and triggers a download or native share dialog (`navigator.share()`). No server-side image generation needed.

## Habit Calendar View

A read-only monthly grid displaying existing `HabitCompletion` data. Each row is a habit, each column is a day of the month, and completed days are filled cells.

### Data Source

Uses the existing `HabitCompletion` model and `HabitRepository.findCompletionsByDate()` method — **no new backend endpoints or models needed**. The frontend fetches habits with completions for the selected month using the existing `habits.getAll` endpoint and filters client-side.

### UI

- Grid with habit names on the left, day numbers across the top
- Completed days show a filled circle in the habit's color (or area color)
- Non-completed days show an empty cell
- Navigable by month (previous/next arrows)

## Technical Implementation

### Database Changes

```prisma
model JournalEntry {
  id                  String    @id @default(uuid()) @db.Uuid
  userId              String
  content             String    @db.Text
  mood                String?   @db.VarChar(20)
  type                String    @default("entry") @db.VarChar(20) // "entry" | "weekly" | "monthly" | "annual"
  lastCapsuleViewedAt DateTime? @db.Timestamp(6)
  createdAt           DateTime  @default(now()) @db.Timestamp(6)
  updatedAt           DateTime  @updatedAt @db.Timestamp(6)
  deletedAt           DateTime? @db.Timestamp(6)

  @@index([userId, createdAt])
  @@index([userId, type])
  @@map("journal_entries")
}
```

Key decisions:

- `mood` is a nullable varchar matching mood IDs from the constants (not a Prisma enum, to avoid migrations when adding moods)
- `type` defaults to `"entry"` for daily entries; reviews use `"weekly"`, `"monthly"`, `"annual"`
- `lastCapsuleViewedAt` tracks when the entry was last surfaced via time capsule
- Soft delete via `deletedAt`
- Composite indexes on `[userId, createdAt]` for calendar queries and `[userId, type]` for review lookups

### New Files

| File                                                                        | Purpose                                       |
| --------------------------------------------------------------------------- | --------------------------------------------- |
| `shared/constants/journal.constants.ts`                                     | Mood definitions (id, emoji, color)           |
| `shared/constants/journal-prompts.constants.ts`                             | 40 prompts across 8 categories with i18n keys |
| `shared/constants/journal-templates.constants.ts`                           | Review templates (weekly/monthly/annual)      |
| `shared/schemas/journal.schemas.ts`                                         | Zod schemas for create/update/query           |
| `shared/types/journal.types.ts`                                             | TypeScript types inferred from schemas        |
| `server/repositories/journal.repository.ts`                                 | Prisma queries for journal entries            |
| `server/services/journal.service.ts`                                        | Business logic, streaks, rewards, cooldowns   |
| `server/routers/journal.router.ts`                                          | tRPC endpoints                                |
| `server/__tests__/journal.service.test.ts`                                  | Service unit tests                            |
| `front/app/(workspace)/journaling/page.tsx`                                 | Main journaling page                          |
| `front/app/(workspace)/journaling/_components/journal-editor.component.tsx` | Markdown editor + mood selector               |
| `front/app/(workspace)/journaling/_components/mood-calendar.component.tsx`  | Monthly mood grid                             |
| `front/app/(workspace)/journaling/_components/mood-mosaic.component.tsx`    | Yearly mosaic with share                      |
| `front/app/(workspace)/journaling/_components/review-panel.component.tsx`   | Review creation with templates                |
| `front/app/(workspace)/journaling/_components/time-capsule.component.tsx`   | Random past entry viewer                      |
| `front/app/(workspace)/journaling/_components/habit-calendar.component.tsx` | Read-only habit completion grid               |
| `front/app/(workspace)/journaling/_components/journal-prompt.component.tsx` | Random prompt button + display                |
| `front/app/(workspace)/journaling/_components/entry-list.component.tsx`     | Past entries list with search                 |

### Files to Modify

| File                                                | Change                                                     |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `server/prisma/schema.prisma`                       | Add `JournalEntry` model                                   |
| `server/services/service.factory.ts`                | Register `JournalService` (Layer 2: repo + dice)           |
| `server/router.ts`                                  | Register `journalingRouter`                                |
| `shared/constants/dice.constants.ts`                | Add `JOURNAL_DICE_REWARDS` and `JOURNAL_STREAK_THRESHOLDS` |
| `front/components/common/app-sidebar.component.tsx` | Add journaling nav item to productivity section            |
| `front/public/locales/en/translation.json`          | Add journaling i18n keys                                   |
| `front/public/locales/es/translation.json`          | Add journaling i18n keys (Spanish)                         |

### tRPC Endpoints

```typescript
export const journalingRouter = t.router({
  // Entries
  create:          protectedProcedure.input(createJournalEntrySchema).mutation(...)   // Create daily entry
  update:          protectedProcedure.input(updateJournalEntrySchema).mutation(...)   // Edit existing entry
  delete:          protectedProcedure.input(journalEntryIdSchema).mutation(...)       // Soft delete
  getById:         protectedProcedure.input(journalEntryIdSchema).query(...)          // Single entry
  getByDate:       protectedProcedure.input(journalDateSchema).query(...)             // Entry for specific date
  getAll:          protectedProcedure.input(journalListSchema).query(...)             // Paginated list with filters

  // Reviews
  createReview:    protectedProcedure.input(createReviewSchema).mutation(...)         // Create review entry
  getReviewStatus: protectedProcedure.query(...)                                     // Cooldown status for all types

  // Calendar & Mood
  getMoodCalendar: protectedProcedure.input(journalMonthSchema).query(...)           // Mood data for month
  getMoodMosaic:   protectedProcedure.input(journalYearSchema).query(...)            // Mood data for full year

  // Time Capsule
  getTimeCapsule:  protectedProcedure.query(...)                                     // Random past entry

  // Stats
  getStreak:       protectedProcedure.query(...)                                     // Current streak info
})
```

### Service Methods

```typescript
class JournalService {
  constructor(
    private journalRepository: JournalRepository,
    private diceService: DiceService
  )

  // Entries
  create(userId: string, input: CreateJournalEntryType): Promise<JournalEntryResult>
  update(userId: string, input: UpdateJournalEntryType): Promise<JournalEntry>
  delete(userId: string, id: string): Promise<void>
  getById(userId: string, id: string): Promise<JournalEntry>
  getByDate(userId: string, date: string): Promise<JournalEntry | null>
  getAll(userId: string, input: JournalListType): Promise<PaginatedResult<JournalEntry>>

  // Reviews
  createReview(userId: string, input: CreateReviewType): Promise<JournalEntryResult>
  getReviewStatus(userId: string): Promise<ReviewStatusResult>

  // Calendar
  getMoodCalendar(userId: string, month: number, year: number): Promise<MoodCalendarResult>
  getMoodMosaic(userId: string, year: number): Promise<MoodMosaicResult>

  // Time Capsule
  getTimeCapsule(userId: string): Promise<JournalEntry | null>

  // Streak
  getStreak(userId: string): Promise<JournalStreakResult>
  private calculateStreak(entries: { createdAt: Date }[]): number
}
```

### Repository Methods

```typescript
class JournalRepository {
  constructor(private prisma: PrismaClient)

  create(userId: string, data: CreateJournalEntryData): Promise<JournalEntry>
  update(id: string, userId: string, data: UpdateJournalEntryData): Promise<JournalEntry>
  softDelete(id: string, userId: string): Promise<void>
  findById(id: string, userId: string): Promise<JournalEntry | null>
  findByDate(userId: string, date: Date): Promise<JournalEntry | null>
  findAll(userId: string, options: ListOptions): Promise<PaginatedResult<JournalEntry>>
  findLastReview(userId: string, type: string): Promise<JournalEntry | null>
  findMoodsByMonth(userId: string, month: number, year: number): Promise<MoodEntry[]>
  findMoodsByYear(userId: string, year: number): Promise<MoodEntry[]>
  findRandomCapsuleEntry(userId: string): Promise<JournalEntry | null>
  updateCapsuleViewedAt(id: string): Promise<void>
  findRecentEntries(userId: string, limit: number): Promise<JournalEntry[]>
}
```

### Zod Schemas

```typescript
// shared/schemas/journal.schemas.ts
import { z } from 'zod'

export const MOOD_IDS = [
  'happy',
  'sad',
  'angry',
  'disappointed',
  'focused',
  'hopeful',
  'depressed',
  'calm',
  'anxious',
  'excited',
  'grateful',
  'tired'
] as const

export const REVIEW_TYPES = ['weekly', 'monthly', 'annual'] as const

export const createJournalEntrySchema = z.object({
  content: z.string().min(1, 'errors.required_field').max(10000),
  mood: z.enum(MOOD_IDS).optional()
})
export type CreateJournalEntryType = z.infer<typeof createJournalEntrySchema>

export const updateJournalEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1, 'errors.required_field').max(10000),
  mood: z.enum(MOOD_IDS).optional().nullable()
})
export type UpdateJournalEntryType = z.infer<typeof updateJournalEntrySchema>

export const journalEntryIdSchema = z.object({
  id: z.string().uuid()
})

export const journalDateSchema = z.object({
  date: z.string().date() // YYYY-MM-DD
})

export const journalListSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
  type: z.enum(['entry', ...REVIEW_TYPES]).optional()
})
export type JournalListType = z.infer<typeof journalListSchema>

export const createReviewSchema = z.object({
  content: z.string().min(1, 'errors.required_field').max(20000),
  type: z.enum(REVIEW_TYPES),
  mood: z.enum(MOOD_IDS).optional()
})
export type CreateReviewType = z.infer<typeof createReviewSchema>

export const journalMonthSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100)
})

export const journalYearSchema = z.object({
  year: z.number().int().min(2020).max(2100)
})
```

## Frontend

### Page Layout

The journaling page uses a tab layout within `ProductivityLayout`:

```
/journaling
  ├── Tab: Write       → Journal editor + mood selector + prompt button
  ├── Tab: Calendar    → Mood calendar (monthly) + Habit calendar
  ├── Tab: Reviews     → Review creation + history
  └── Tab: Time Capsule → Random past entry viewer
```

### Markdown Editor

Uses `@uiw/react-md-editor` (install as dependency):

```bash
cd front && pnpm add @uiw/react-md-editor
```

The editor renders in the "Write" tab with:

```bash
cd front && pnpm add @uiw/react-md-editor
```

The editor renders in the "Write" tab with:

- Toolbar: bold, italic, headings, lists, quote
- Preview toggle (write / preview / split)
- Mood selector dropdown below the editor
- "Give me a prompt" button that inserts a random prompt as a heading
- Save button (creates/updates entry for today)

### Component Hierarchy

```
page.tsx (Suspense boundary)
  └── Tabs
      ├── Write Tab
      │   ├── JournalPrompt (random prompt button)
      │   ├── JournalEditor (markdown editor + mood selector)
      │   └── EntryList (recent entries below editor)
      ├── Calendar Tab
      │   ├── MoodCalendar (monthly mood grid)
      │   ├── MoodMosaic (yearly view + share button)
      │   └── HabitCalendar (read-only habit completion grid)
      ├── Reviews Tab
      │   └── ReviewPanel (create review + history + cooldown status)
      └── Time Capsule Tab
          └── TimeCapsule (random past entry display)
```

### Navigation

Add to the productivity section of the sidebar:

```typescript
{ title: t('sidebar.journaling'), url: '/journaling', icon: Feather }
```

Uses the `Feather` icon from `@nsmr/pixelart-react` (or closest available writing-themed icon).

## i18n Keys

### English (`en/translation.json`)

```json
{
  "sidebar": {
    "journaling": "Journaling"
  },
  "journaling": {
    "title": "Journaling",
    "write": "Write",
    "calendar": "Calendar",
    "reviews": "Reviews",
    "timeCapsule": "Time Capsule",
    "editor": {
      "placeholder": "How was your day?",
      "save": "Save Entry",
      "saved": "Entry saved",
      "updated": "Entry updated",
      "deleted": "Entry deleted",
      "confirmDelete": "Are you sure you want to delete this entry?"
    },
    "mood": {
      "label": "How are you feeling?",
      "happy": "Happy",
      "sad": "Sad",
      "angry": "Angry",
      "disappointed": "Disappointed",
      "focused": "Focused",
      "hopeful": "Hopeful",
      "depressed": "Depressed",
      "calm": "Calm",
      "anxious": "Anxious",
      "excited": "Excited",
      "grateful": "Grateful",
      "tired": "Tired"
    },
    "prompt": {
      "button": "Give me a prompt",
      "gratitude": {
        "0": "What are three things you're grateful for today?",
        "1": "Who is someone you appreciate and why?",
        "2": "What small moment brought you joy today?",
        "3": "What ability or resource are you thankful for?",
        "4": "What challenge are you grateful to have faced?"
      },
      "reflection": {
        "0": "What moment from today will you remember most?",
        "1": "If you could relive one hour of today, which would it be?",
        "2": "What surprised you today?",
        "3": "What did you learn about yourself today?",
        "4": "How did today differ from what you expected?"
      },
      "growth": {
        "0": "What skill or habit did you work on today?",
        "1": "What would you do differently if you could redo today?",
        "2": "What step did you take outside your comfort zone?",
        "3": "How are you different from who you were a month ago?",
        "4": "What feedback did you receive and how did it make you feel?"
      },
      "challenges": {
        "0": "What was the hardest part of your day and how did you cope?",
        "1": "What obstacle are you currently facing?",
        "2": "What fear did you confront today?",
        "3": "What problem are you trying to solve right now?",
        "4": "What mistake did you make today and what did it teach you?"
      },
      "goals": {
        "0": "What is one step you took today toward a long-term goal?",
        "1": "Where do you want to be in six months?",
        "2": "What goal have you been procrastinating on and why?",
        "3": "What does your ideal day look like?",
        "4": "What is the most important thing you need to accomplish this week?"
      },
      "emotions": {
        "0": "What emotion dominated your day and why?",
        "1": "When did you feel most at peace today?",
        "2": "What triggered your strongest emotion today?",
        "3": "How did you manage stress today?",
        "4": "What made you smile today?"
      },
      "relationships": {
        "0": "Who made an impact on your day and how?",
        "1": "What conversation stood out to you today?",
        "2": "How did you help someone today?",
        "3": "Who do you wish you had spent more time with today?",
        "4": "What relationship in your life are you most grateful for?"
      },
      "creativity": {
        "0": "If today were a chapter in a book, what would the title be?",
        "1": "Describe today using only five words.",
        "2": "What song best represents your mood today?",
        "3": "If you could paint today, what colors would you use?",
        "4": "Write a short letter to your future self about today."
      }
    },
    "streak": {
      "current": "Current streak",
      "days": "{{count}} day",
      "days_plural": "{{count}} days",
      "bonus": "+{{bonus}} bonus dice"
    },
    "review": {
      "weekly": "Weekly Review",
      "monthly": "Monthly Review",
      "annual": "Annual Review",
      "cooldown": "Available in {{days}} days",
      "available": "Available now",
      "create": "Start Review",
      "lastCompleted": "Last completed: {{date}}"
    },
    "capsule": {
      "title": "Time Capsule",
      "description": "A random entry from your past",
      "empty": "Keep journaling — your time capsule will unlock soon",
      "writtenOn": "Written on {{date}}",
      "refresh": "Show another"
    },
    "moodCalendar": {
      "title": "Mood Calendar",
      "noMood": "No mood recorded"
    },
    "moodMosaic": {
      "title": "Mood Mosaic",
      "share": "Share Mosaic",
      "year": "{{year}} Mood Mosaic"
    },
    "habitCalendar": {
      "title": "Habit Calendar"
    },
    "entries": {
      "title": "Past Entries",
      "empty": "No entries yet. Start writing!",
      "search": "Search entries..."
    },
    "dice": {
      "earned": "You earned {{count}} dice!"
    }
  }
}
```

### Spanish (`es/translation.json`)

```json
{
  "sidebar": {
    "journaling": "Diario"
  },
  "journaling": {
    "title": "Diario",
    "write": "Escribir",
    "calendar": "Calendario",
    "reviews": "Revisiones",
    "timeCapsule": "Cápsula del Tiempo",
    "editor": {
      "placeholder": "¿Cómo fue tu día?",
      "save": "Guardar Entrada",
      "saved": "Entrada guardada",
      "updated": "Entrada actualizada",
      "deleted": "Entrada eliminada",
      "confirmDelete": "¿Estás seguro de que quieres eliminar esta entrada?"
    },
    "mood": {
      "label": "¿Cómo te sientes?",
      "happy": "Feliz",
      "sad": "Triste",
      "angry": "Enfadado",
      "disappointed": "Decepcionado",
      "focused": "Concentrado",
      "hopeful": "Esperanzado",
      "depressed": "Deprimido",
      "calm": "Tranquilo",
      "anxious": "Ansioso",
      "excited": "Emocionado",
      "grateful": "Agradecido",
      "tired": "Cansado"
    },
    "prompt": {
      "button": "Dame un tema",
      "gratitude": {
        "0": "¿Cuáles son tres cosas por las que estás agradecido hoy?",
        "1": "¿Quién es alguien que aprecias y por qué?",
        "2": "¿Qué pequeño momento te trajo alegría hoy?",
        "3": "¿Qué habilidad o recurso agradeces tener?",
        "4": "¿Qué desafío agradeces haber enfrentado?"
      },
      "reflection": {
        "0": "¿Qué momento de hoy recordarás más?",
        "1": "Si pudieras revivir una hora de hoy, ¿cuál sería?",
        "2": "¿Qué te sorprendió hoy?",
        "3": "¿Qué aprendiste sobre ti mismo hoy?",
        "4": "¿En qué se diferenció hoy de lo que esperabas?"
      },
      "growth": {
        "0": "¿Qué habilidad o hábito trabajaste hoy?",
        "1": "¿Qué harías diferente si pudieras rehacer hoy?",
        "2": "¿Qué paso diste fuera de tu zona de confort?",
        "3": "¿Cómo eres diferente de quien eras hace un mes?",
        "4": "¿Qué retroalimentación recibiste y cómo te hizo sentir?"
      },
      "challenges": {
        "0": "¿Cuál fue la parte más difícil de tu día y cómo lo manejaste?",
        "1": "¿Qué obstáculo estás enfrentando actualmente?",
        "2": "¿Qué miedo enfrentaste hoy?",
        "3": "¿Qué problema estás intentando resolver ahora mismo?",
        "4": "¿Qué error cometiste hoy y qué te enseñó?"
      },
      "goals": {
        "0": "¿Qué paso diste hoy hacia una meta a largo plazo?",
        "1": "¿Dónde quieres estar en seis meses?",
        "2": "¿Qué meta has estado posponiendo y por qué?",
        "3": "¿Cómo es tu día ideal?",
        "4": "¿Cuál es lo más importante que necesitas lograr esta semana?"
      },
      "emotions": {
        "0": "¿Qué emoción dominó tu día y por qué?",
        "1": "¿Cuándo te sentiste más en paz hoy?",
        "2": "¿Qué provocó tu emoción más fuerte hoy?",
        "3": "¿Cómo manejaste el estrés hoy?",
        "4": "¿Qué te hizo sonreír hoy?"
      },
      "relationships": {
        "0": "¿Quién tuvo un impacto en tu día y cómo?",
        "1": "¿Qué conversación te llamó la atención hoy?",
        "2": "¿Cómo ayudaste a alguien hoy?",
        "3": "¿Con quién desearías haber pasado más tiempo hoy?",
        "4": "¿Qué relación en tu vida agradeces más?"
      },
      "creativity": {
        "0": "Si hoy fuera un capítulo de un libro, ¿cuál sería el título?",
        "1": "Describe hoy usando solo cinco palabras.",
        "2": "¿Qué canción representa mejor tu estado de ánimo hoy?",
        "3": "Si pudieras pintar hoy, ¿qué colores usarías?",
        "4": "Escribe una breve carta a tu yo del futuro sobre hoy."
      }
    },
    "streak": {
      "current": "Racha actual",
      "days": "{{count}} día",
      "days_plural": "{{count}} días",
      "bonus": "+{{bonus}} dados extra"
    },
    "review": {
      "weekly": "Revisión Semanal",
      "monthly": "Revisión Mensual",
      "annual": "Revisión Anual",
      "cooldown": "Disponible en {{days}} días",
      "available": "Disponible ahora",
      "create": "Comenzar Revisión",
      "lastCompleted": "Última completada: {{date}}"
    },
    "capsule": {
      "title": "Cápsula del Tiempo",
      "description": "Una entrada aleatoria de tu pasado",
      "empty": "Sigue escribiendo — tu cápsula del tiempo se desbloqueará pronto",
      "writtenOn": "Escrito el {{date}}",
      "refresh": "Mostrar otra"
    },
    "moodCalendar": {
      "title": "Calendario de Ánimo",
      "noMood": "Sin estado de ánimo registrado"
    },
    "moodMosaic": {
      "title": "Mosaico de Ánimo",
      "share": "Compartir Mosaico",
      "year": "Mosaico de Ánimo {{year}}"
    },
    "habitCalendar": {
      "title": "Calendario de Hábitos"
    },
    "entries": {
      "title": "Entradas Anteriores",
      "empty": "Sin entradas aún. ¡Empieza a escribir!",
      "search": "Buscar entradas..."
    },
    "dice": {
      "earned": "¡Ganaste {{count}} dados!"
    }
  }
}
```

## Implementation Phases

### Phase 1: Backend Foundation

1. Add `JournalEntry` model to `schema.prisma`
2. Run `npx prisma migrate dev` to create migration
3. Create shared constants (moods, prompts, templates)
4. Create Zod schemas in `shared/schemas/journal.schemas.ts`
5. Add dice constants to `shared/constants/dice.constants.ts`

### Phase 2: Repository & Service

1. Implement `JournalRepository` with all query methods
2. Implement `JournalService` with business logic, streak calculation, and cooldown enforcement
3. Register `JournalService` in service factory (Layer 2: repo + dice)

### Phase 3: Router & Endpoints

1. Implement `journalingRouter` with all 12 endpoints
2. Register router in `server/router.ts`
3. Add i18n keys to both locale files

### Phase 4: Frontend — Write Tab

1. Install `@uiw/react-md-editor`
2. Create journaling page with tab layout
3. Implement `JournalEditor` component with markdown editor and mood selector
4. Implement `JournalPrompt` component
5. Implement `EntryList` component
6. Add sidebar navigation link

### Phase 5: Frontend — Calendar Tab

1. Implement `MoodCalendar` component (monthly mood grid)
2. Implement `MoodMosaic` component (yearly canvas + share)
3. Implement `HabitCalendar` component (read-only habit grid)

### Phase 6: Frontend — Reviews & Time Capsule

1. Implement `ReviewPanel` component with templates and cooldown display
2. Implement `TimeCapsule` component

### Phase 7: Testing & Polish

1. Write service unit tests (`server/__tests__/journal.service.test.ts`)
2. Manual testing of all flows
3. UI polish and responsive design
4. Verify i18n in both languages

## Future Expansion

### AI Insights

- Weekly mood pattern analysis
- Prompt suggestions based on past entries
- Sentiment trends over time

### Tags & Search

- User-defined tags on entries
- Full-text search across entries
- Filter by mood, date range, or tags

### Guided Journaling

- Structured multi-step journaling flows (e.g., CBT-based, gratitude journaling)
- Customizable journal templates

### Export

- Export all entries as markdown, PDF, or JSON
- Date range filtering on export

### Social Features

- Shareable mood mosaics (public link)
- Optional accountability partner (shared streak visibility)

## Verification Checklist

Database:

- [ ] `JournalEntry` model added with all fields (`content`, `mood`, `type`, `lastCapsuleViewedAt`, `deletedAt`)
- [ ] Indexes on `[userId, createdAt]` and `[userId, type]`
- [ ] Migration applied successfully (`npx prisma migrate dev`)

Backend:

- [ ] `JournalRepository` with CRUD, mood queries, capsule query, and review lookup
- [ ] `JournalService` with streak calculation, review cooldown enforcement, and dice rewards
- [ ] `JournalService` registered in service factory (Layer 2)
- [ ] 12 tRPC endpoints on `journalingRouter`
- [ ] Router registered in `server/router.ts`

Shared:

- [ ] 12 mood definitions in `shared/constants/journal.constants.ts`
- [ ] 40 prompts across 8 categories in `shared/constants/journal-prompts.constants.ts`
- [ ] 3 review templates in `shared/constants/journal-templates.constants.ts`
- [ ] Dice reward constants added to `shared/constants/dice.constants.ts`
- [ ] Zod schemas for all inputs in `shared/schemas/journal.schemas.ts`

Frontend:

- [ ] `/journaling` page with 4 tabs (Write, Calendar, Reviews, Time Capsule)
- [ ] Markdown editor with mood selector and prompt button
- [ ] Mood calendar (monthly grid) with day-click navigation
- [ ] Mood mosaic (yearly canvas) with share/download
- [ ] Habit calendar (read-only monthly grid from existing data)
- [ ] Review panel with template pre-fill and cooldown display
- [ ] Time capsule with random entry display and empty state
- [ ] Sidebar link in productivity section

i18n:

- [ ] All keys added to `en/translation.json` including 40 prompts
- [ ] All keys added to `es/translation.json` including 40 prompts
- [ ] No hardcoded user-facing strings

Tests:

- [ ] `journal.service.test.ts` covers entry CRUD, streak calculation, review cooldowns, dice rewards
- [ ] Tests pass (`cd server && pnpm test`)
- [ ] Lint passes (`cd front && pnpm lint`)
