# Habitica-Inspired Retention & Loop Features

> **Version**: 1.0
> **Status**: Planned
> **Last Updated**: 2026-05-10
> **Source**: derived from analysis of `docs/habitica_feedback.md` (Reddit community feedback + subreddit analysis of Habitica)

## Summary

Eight features distilled from Habitica community pain points and feature requests, scoped to gaps Covenant does not already cover. Four target the core loop (`[loop]`); five target retention (`[retention]`); one is a sub-bullet under the existing Guild system item.

These are competitor-research-derived features. They are not blockers for the closed beta but should be queued so the post-validation roadmap has a clear differentiation strategy: Covenant does the things Habitica veterans repeatedly ask for and never receive.

Items already covered elsewhere — onboarding tutorial, guild system, story decisions, character/equipped-items render, AI monthly report, conversation quests, theme system — are intentionally out of scope here; see `TODO.md` and `docs/specs/tutorial_dialog.md`.

## Goals

1. Close concrete feature-request gaps Habitica has ignored for years (last-completed metric, flexible recurrence, year-view consistency)
2. Differentiate on psychology: Covenant should feel kind on bad days, not punishing — direct counter to the most-cited Habitica churn driver
3. Strengthen the analytics surface so users who want data (not pixel pets) have it
4. Keep all changes additive — no breaking schema migrations, no rework of the validated core loop

## Items

### High Priority

#### 1. Habit "last completed" metric `[retention]`

**Motivation.** Habitica feature request: _"a 'last date completed' metric. So I can see I haven't painted in a month, for example. I'm keeping track of this manually, but it'd be nice for it to be tracked automatically."_

**State today.** `HabitCompletion` already records `completedAt` (`prisma/schema.prisma:241`). Streak is computed (`src/server/services/habit.service.ts:68`) but the most-recent completion timestamp is not surfaced in any UI.

**Design.**
- Compute `lastCompletedAt` from the existing completions list inside `habits.getAll` (no new endpoint, no schema change).
- Render relative date ("3 days ago", "never") on each habit card.
- Highlight habits not done within their recurrence window so neglected habits stand out visually.

---

#### 2. Consistency heatmap (year view) `[retention]`

**Motivation.** Habitica gap: _"real progress graphs, consistency statistics, and a more robust completed task history."_ Subreddit analysis lists this under "Productivity over cosmetics" — a market segment willing to pay for analytics.

**State today.** Dashboard shows an 8-day rolling pie + completion rate (`src/server/services/dashboard.service.ts:28-79`). No long-term consistency view exists.

**Design.**
- GitHub-style year heatmap rendered on `/dashboard` (or `/calendar`).
- Cells colored by total completions per day across all habits + tasks.
- Hover tooltip lists what was completed that day.
- Reuse existing Recharts dependency or a lightweight cell-grid component — no new chart library.

---

#### 3. Vacation mode / habit pause `[retention]`

**Motivation.** Habitica's most-cited churn psychology, quoted in `docs/habitica_feedback.md`:
> _"For some users (especially those with depression or ADHD), the punishment for not completing tasks is too severe and causes them to abandon the app out of guilt rather than motivating them."_

This is the single biggest differentiator opportunity vs Habitica.

**State today.** No pause/vacation mechanism. Streak breaks on any miss. Habit damage system not yet shipped, but the gap is structural.

**Design.**
- Add `pausedAt DateTime?` and `pausedUntil DateTime?` columns to `Habit` (`prisma/schema.prisma:219-235`).
- Per-habit: menu action "Pause" with optional duration.
- Account-wide: "Vacation mode" toggle in `/settings` that flags all habits as paused for the duration.
- While paused: `createCompletion` still works (and still rewards), but streak break logic and any future damage logic must skip paused habits.
- Streak calculation (`src/server/services/dice.service.ts` — `calculateHabitStreak`) treats paused intervals as non-counting rather than as misses.

**Open design questions.**
- Should paused habits still grant dice if completed? (Default: yes — encourages light engagement on low-energy days.)
- Should vacation mode auto-expire? (Default: optional `pausedUntil`, otherwise manual unpause.)

---

#### 4. Flexible recurrence patterns `[loop]`

**Motivation.** Top recurring Habitica feature request, called out in subreddit analysis under _"Flexible scheduling: set tasks for 'every other day' or 'certain days of the month' more intuitively."_

**State today.** Schema supports DAILY/WEEKLY/MONTHLY + integer recurrence count only:
```
recurrence  Int               @default(1)        // prisma/schema.prisma:223
timespan    String            @db.VarChar(255)   // prisma/schema.prisma:224
```
Zod schema: `src/shared/schemas/habits.schemas.ts:3-13` (`HabitTimespan` enum).

This cannot express "Mon/Wed/Fri", "1st and 15th of each month", or "every other day starting Tuesday."

**Design.**
- Add `recurrenceConfig Json?` to `Habit`; keep existing `recurrence` + `timespan` for backward compatibility (the JSON is the override).
- Shape (Zod-validated):
  ```ts
  type RecurrenceConfig =
    | { kind: 'daily', interval: number, anchor: string /* ISO date */ }
    | { kind: 'weekly', daysOfWeek: number[] /* 0–6 */ }
    | { kind: 'monthly', daysOfMonth: number[] /* 1–31 */ }
  ```
- Habit form picker: tabbed "Daily / Weekly / Monthly / Custom" with day-of-week and day-of-month toggles.
- Streak + due-window logic switches on `recurrenceConfig` when present, otherwise falls back to the legacy fields.

---

### Medium Priority

#### 5. Streak freeze tokens `[retention]`

**Motivation.** Pairs with #3. Habitica complaint: _"losing a day due to a server error can ruin months of in-game progress."_ More generally, single missed days from real life are punished disproportionately.

**Design.**
- Each user starts each month with N skip tokens (e.g., 2). Token count stored on `User` or a new `UserMonthlyAllowance` table.
- When a habit would lapse and break a streak, auto-consume one token to preserve the streak. Surface it in UI: _"Streak freeze used — 1 left this month."_
- Configurable: opt-out (some users prefer hard streaks).
- Tokens reset monthly; do not roll over (avoid hoarding then bingeing).

---

#### 6. Custom date-range analytics + completed task history `[retention]`

**Motivation.** Habitica gap: _"more robust completed task history."_ Dashboard locked to 8-day rolling window (`src/server/services/dashboard.service.ts:28-79`) — users have no way to see "this quarter" or "last month."

**Design.**
- Date-range picker on `/dashboard` (preset ranges + custom).
- Filterable history view: per habit, per task, per area.
- Reuse existing pie/metric components but parameterize the query window.
- Backend: `dashboard.getData` accepts an optional `{ from, to }` range.

---

#### 7. Per-habit difficulty levels `[loop]`

**Motivation.** Habitica's _"punishment vs motivation"_ criticism + their existing trivial/easy/medium/hard model. Covenant currently rewards a uniform 2 dice + streak bonus (`src/server/services/habit.service.ts:70-74`), which scales poorly when users want to track both "stretch 5 minutes" and "deep work 2 hours" as the same kind of habit.

**Design.**
- Add `difficulty` enum on `Habit` (`TRIVIAL | EASY | MEDIUM | HARD`); default `EASY` for backward compat.
- Reward scaling: e.g. 1 / 2 / 3 / 5 dice base.
- Streak bonus multiplier scales similarly.

**Note.** Covenant has no penalty/HP-loss model for missed habits today. If/when one is introduced, difficulty should also modulate penalty severity — but reward-scaling alone is a clean, isolated change and should ship first. Penalty design is out of scope for this spec.

---

### Sub-bullet under existing Guild system item

#### 8. Heavy-hitter balance for guild combat `[retention]`

**Motivation.** Habitica feedback: _"In parties, a high-level player can defeat bosses in a single hit, removing the fun and sense of progression for lower-level teammates."_

**State today.** Covenant has no party/guild combat yet. The Guild system item in `TODO.md` will introduce it. This bullet is a design constraint to remember when that ships, not a separate work item.

**Design intent (when guild combat ships).**
- Cap individual contribution per encounter so a single high-level member cannot solo a guild boss.
- Scale enemy HP with active participant count, not with the highest level.
- Reward distribution should be participation-weighted, not damage-weighted, to avoid leaderboard chasing crowding out lower levels.

---

## Items deliberately deferred

| Item | Why deferred |
|------|--------------|
| Google Calendar 2-way sync | Large effort; defer until validation. Add to Backlog (post-validation) when scoped. |
| PWA / offline mobile | Large effort; web-only is acceptable for closed beta. |
| Multi-stage quest chains with recurring NPCs | Partially covered by existing "Define story decisions" TODO + `docs/specs/tutorial_dialog.md`. Revisit when those land. |
| Theme/reskin (non-fantasy) | Covenant's 6-faction system already provides theme variety; existing Backlog item "Theme system: OS-preference option" covers light/dark. |
| Account/profile management, GDPR export | Already on `TODO.md` under "Account management". |

## Cross-references

- `docs/habitica_feedback.md` — source community feedback
- `TODO.md` — items 1–7 mirrored as TODO bullets, item 8 mirrored as a sub-bullet under Guild system
- `docs/specs/gamification.md` — core loop reference (difficulty levels affect dice reward scaling)
- `docs/specs/tutorial_dialog.md` — adjacent work on conversation/branching quests
