# RPG Reward vs Sink Metrics

## Purpose

Determine whether the RPG layer helps users return to productive action, or whether it becomes a parallel activity that consumes attention without increasing real-world completions.

## Core Question

The RPG layer is a reward if users complete more real work because combat, gear, quests, guilds, and progression make that work feel meaningful.

The RPG layer is a sink if users spend increasing time managing the game without a matching lift in tasks, habits, objectives, or journal entries.

## Primary Success Metrics

### Completion Lift

Track completions per active user per day across:

- Tasks completed
- Habit completions
- Objectives completed
- Journal entries created
- Total mana earned

Segment users by RPG engagement:

- No RPG visit after productivity completion
- Quest/combat visit after productivity completion
- Shop/inventory visit after productivity completion
- Guild visit after productivity completion

Success signal: users who engage with the RPG layer complete more real-world actions in the next 24 hours and 7 days than comparable users who do not.

### Reward Return Loop

Track the sequence:

1. Productivity completion grants mana
2. User visits a quest/combat screen
3. User spends mana or Reserve
4. User earns gold, kill progress, tier progress, or gear access
5. User returns to productivity views
6. User completes another real-world action

Success signal: the median user who enters combat returns to a productivity view and completes another task/habit/objective/journal entry within 24 hours.

### RPG Time Ratio

Track session time split:

- Productivity views: `/tasks`, `/habits`, `/objectives`, `/journaling`, `/calendar`, `/dashboard`
- RPG views: `/quests`, `/quests/[id]`, `/inventory`, `/shop`, `/guilds`

Success signal: RPG time grows alongside completion volume, not instead of it.

Risk signal: RPG time rises while completions per active day fall.

## Sink Warning Metrics

### Management Drag

Track repeated visits with no productive follow-up:

- Inventory/shop/guild visits without a subsequent completion
- Quest starts without later productivity completions
- Long RPG sessions after low or zero mana earning
- High item/equipment interactions per completed task

Warning signal: users spend multiple sessions tuning gear, shopping, or reading guild content but do not complete more real-world work.

### Reward Saturation

Track whether rewards stop mattering:

- Mana Reserve balance over time
- Gold balance over time
- Purchases per gold earned
- Tier progress at cap
- Combat starts per available Reserve

Warning signal: Reserve or gold accumulates without being spent, or capped users stop returning to productivity actions.

### Friction and Abandonment

Track:

- Quest abandonment rate
- Combat defeat rate
- Time from completion toast to first quest action
- Time from quest completion to next productivity action
- Users who churn after defeat or stalled combat

Warning signal: users leave after combat frustration, or do not understand how completions connect to power.

## Cohorts

Compare:

- New users in first 1, 3, and 7 days
- Users with zero RPG sessions
- Users with 1-2 RPG sessions per week
- Users with 3+ RPG sessions per week
- Users with high Reserve and low combat usage
- Users with high combat usage and low productivity completion
- Users who join guilds vs solo users

## Event Instrumentation

Event taxonomy lives in [`posthog_integration.md`](./posthog_integration.md#event-taxonomy). The v1 set is deliberately Pareto-strict — only events that load-bear on the core reward-vs-sink question ship.

How the metrics in this doc map onto the v1 event set:

- **Completion Lift** — per-source events (`task_completed`, `habit_completed`, `objective_completed`, `journal_entry_created`) carry `mana_earned` / `reserve_gained`. Segment by RPG engagement via `$pageview` URL filters (RPG-views cohort defined in posthog spec).
- **Reward Return Loop** — `combat_started` → productivity-completion events sequence in PostHog Funnels. `combat_started.reserve_at_start` / `mana_at_start` snapshot pre-fight resource state.
- **RPG Time Ratio** — `$pageview` + `$pageleave` with the productivity-views and RPG-views URL cohorts.
- **Combat outcome** — `combat_finished` with `outcome` (`'victory'` \| `'defeat'` \| `'abandoned'`) and `gold_earned` (nullable on defeat/abandoned).

Events deliberately cut from v1 and tracked in [Out of Scope](./posthog_integration.md#out-of-scope):

- `rpg_viewed` — redundant with `$pageview` + URL filters
- `returned_to_productivity` — derivable from `$pageview` sequencing in Funnels
- `rpg_reward_spent` — gold-spend rides on `item_purchased` (deferred to Phase 4); reserve-to-mana refill derivable from `combat_started` deltas
- `productivity_completed` umbrella — split into per-source events for stronger typing at callsites

### Sink Warning instrumentation (Phase 4)

The Reward Saturation, Management Drag, and Friction signals in this doc require additional instrumentation deferred to Phase 4 of the posthog rollout:

- Person properties `mana_reserve`, `gold_balance`, `tier` — `$set` on existing captures
- `character_leveled_up` event for tier-progression cohorts
- `item_purchased` / `item_equipped` for gear-loop analysis

See [`posthog_integration.md` § Phase 4](./posthog_integration.md#phase-4-sink-saturation-instrumentation).

## Decision Thresholds

Treat the RPG layer as healthy when:

- D7 retention is higher for RPG-engaged users after controlling for baseline completion count.
- Users who finish combat complete at least one more productivity action within 24 hours at a higher rate than users who do not enter combat.
- RPG time ratio stays below a product-defined ceiling while completion volume rises.
- Reserve and gold are spent often enough that rewards feel useful.

Treat the RPG layer as a sink when:

- RPG-engaged users spend more time in the app but complete fewer real-world actions.
- Inventory/shop/guild activity becomes the dominant session behavior for low-completion users.
- Quest/combat frustration correlates with churn.
- Reward balances inflate without meaningful spending.

## Qualitative Checks

Ask users:

- Did combat make you want to complete another real task?
- Did the RPG layer feel like a reward or another obligation?
- Did you understand why your mana changed?
- Did Reserve feel useful?
- Did you ever open the RPG layer to procrastinate?

Use these answers to interpret the quantitative metrics, especially for ADHD, depression, burnout, and low-energy user segments.
