# Habitica-Inspired Retention & Loop Features

> **Version**: 2.0
> **Status**: Planned
> **Last Updated**: 2026-05-18
> **Source**: derived from analysis of `docs/habitica_feedback.md` (Reddit community feedback + subreddit analysis of Habitica)

## Summary

Three features distilled from Habitica community pain points and feature requests, scoped to gaps Covenant does not already cover. Two target the core loop (`[loop]`); one targets retention (`[retention]`).

These are competitor-research-derived features. They are not blockers for the closed beta but should be queued so the post-validation roadmap has a clear differentiation strategy: Covenant does the things Habitica veterans repeatedly ask for and never receive.

Items already covered elsewhere — onboarding tutorial, guild system, story decisions, character/equipped-items render, AI monthly report, conversation quests, theme system, habit last-completed metric — are intentionally out of scope here; see `TODO.md` and `docs/specs/tutorial_dialog.md`.

## Goals

1. Close concrete feature-request gaps Habitica has ignored for years (flexible recurrence, year-view consistency)
2. Strengthen the analytics surface so users who want data (not pixel pets) have it
3. Differentiate reward granularity — give users a way to scale rewards to effort instead of a single uniform payout
4. Keep all changes additive — no breaking schema migrations, no rework of the validated core loop

## Items

Ship order reflects dependency and impact: recurrence first (unblocks streak/due-window correctness for the other two), heatmap second (analytics surface), difficulty last (touches reward tuning).

### 1. Flexible recurrence patterns `[loop]`

**Motivation.** Top recurring Habitica feature request, called out in subreddit analysis under _"Flexible scheduling: set tasks for 'every other day' or 'certain days of the month' more intuitively."_

**State today.** Schema supports DAILY/WEEKLY/MONTHLY + integer recurrence count only:
```
recurrence  Int               @default(1)        // prisma/schema.prisma:233
timespan    String            @db.VarChar(255)   // prisma/schema.prisma:234
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

### 2. Consistency heatmap (year view) `[retention]`

**Motivation.** Habitica gap: _"real progress graphs, consistency statistics, and a more robust completed task history."_ Subreddit analysis lists this under "Productivity over cosmetics" — a market segment willing to pay for analytics.

**State today.** Dashboard shows an 8-day rolling pie + completion rate (`src/server/services/dashboard.service.ts:28-79`). No long-term consistency view exists.

**Design.**
- GitHub-style year heatmap rendered on `/dashboard` (or `/calendar`).
- Cells colored by total completions per day across all habits + tasks.
- Hover tooltip lists what was completed that day.
- Reuse existing Recharts dependency or a lightweight cell-grid component — no new chart library.

---

### 3. Per-habit difficulty levels `[loop]`

**Motivation.** Habitica's existing trivial/easy/medium/hard model addresses a real granularity gap. Covenant currently rewards a uniform 2 dice + streak bonus (`src/server/services/habit.service.ts:74-79`), which scales poorly when users want to track both "stretch 5 minutes" and "deep work 2 hours" as the same kind of habit.

**Design.**
- Add `difficulty` enum on `Habit` (`TRIVIAL | EASY | MEDIUM | HARD`); default `EASY` for backward compat.
- Reward scaling: e.g. 1 / 2 / 3 / 5 dice base.
- Streak bonus multiplier scales similarly.

**Tuning risk.** Without a cap, users mark everything `HARD`. Mitigate via a per-day soft cap on dice from habits, or a per-tier daily cap, before rollout.

**Note.** Covenant has no penalty/HP-loss model for missed habits today. If/when one is introduced, difficulty should also modulate penalty severity — but reward-scaling alone is a clean, isolated change and should ship first. Penalty design is out of scope for this spec.

---

## Items deliberately deferred

| Item | Why deferred |
|------|--------------|
| Habit "last completed" metric | **Shipped.** Implemented in `src/server/services/habit.service.ts:26-30` and surfaced via `lastCompletedLabel` + `isNeglected` in `src/app/(workspace)/habits/_components/habit-card.component.tsx:34-43`. |
| Vacation mode / habit pause | Covenant has no damage/HP-loss model for missed habits today — the only "punishment" is a streak number reset. Pause mechanic is a solution before the problem exists. Revisit if/when a penalty system ships. |
| Streak freeze tokens | Same rationale as vacation mode, and overlaps with it. Reconsider only after a penalty system exists and proves the soft-failure cases need an automatic fallback distinct from explicit pause. |
| Custom date-range analytics + completed task history | Overlaps with the year heatmap (#2). Ship the heatmap first; revisit only if users still ask for arbitrary ranges. Backend widening of `dashboard.getData` is cheap, but the filter/history UI is not, and not validated. |
| Heavy-hitter balance for guild combat | No guild combat exists yet. Capture as a design constraint under Guild Phase 4 in `TODO.md`, not as a separate work item. |
| Google Calendar 2-way sync | Large effort; defer until validation. Add to Backlog (post-validation) when scoped. |
| PWA / offline mobile | Large effort; web-only is acceptable for closed beta. |
| Multi-stage quest chains with recurring NPCs | Partially covered by existing "Define story decisions" TODO + `docs/specs/tutorial_dialog.md`. Revisit when those land. |
| Theme/reskin (non-fantasy) | Covenant's 6-faction system already provides theme variety; existing Backlog item "Theme system: OS-preference option" covers light/dark. |
| Account/profile management, GDPR export | Already on `TODO.md` under "Account management". |

## Cross-references

- `docs/habitica_feedback.md` — source community feedback
- `TODO.md` — items 1–3 mirrored as TODO bullets
- `docs/specs/gamification.md` — core loop reference (difficulty levels affect dice reward scaling)
- `docs/specs/tutorial_dialog.md` — adjacent work on conversation/branching quests
