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

Minimum events:

- `productivity_completed`
  - `source`: task, habit, objective, journal
  - `mana_earned`
  - `mana_applied`
  - `reserve_gained`
- `rpg_viewed`
  - `view`: quests, combat, inventory, shop, guilds
- `combat_started`
  - `quest_id`
  - `reserve_at_start`
  - `mana_at_start`
- `combat_finished`
  - `quest_id`
  - `outcome`: victory, defeat, abandoned
  - `gold_earned`
  - `kills`
  - `tier_changed`
- `rpg_reward_spent`
  - `reward_type`: mana, reserve, gold
  - `amount`
  - `target`: ability, encounter_refill, item
- `returned_to_productivity`
  - `source_view`
  - `next_productivity_view`
  - `minutes_since_rpg_action`

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
