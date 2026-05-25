---
title: 'A Week in Covenant: A Real Home Page, Tasks Your Way, and Guild Identity'
date: 2026-05-24
author: Yifan
tags: [release-notes, features]
---

# A Week in Covenant: A Fresh Home Page, Tasks Your Way, and Guild Identity

Heavy week. The home page got rebuilt, tasks and habits learned to bend to how you actually work, and guilds finally have a face.

## The dashboard is now a real home page

When you land in Covenant, the dashboard used to be a polite shrug. Now it's the page I actually want to open first.

- A **trend chart** showing your output over the last weeks, bucketed by your timezone instead of UTC (which meant tasks done at 11pm were silently rolling into "tomorrow" — embarrassing, fixed now)
- A **today summary** card with what's due, what's overdue, and what you've already cleared
- **Quick-complete habits** right on the home page. The whole point of a daily habit is friction-free check-in. Two clicks to open habits and find the right row was already too many

## Tasks bend to how you actually work

The old task system shipped with three hardcoded statuses: To-do, In-progress, Done. Fine defaults. Wrong for half the people using it.

- **User-defined statuses.** Make a "Blocked" column. Make a "Waiting on someone." Make seven columns if that's how your brain works. The kanban board, the list, the dropdowns — they all read from your statuses
- **Per-tab visibility.** Hide the kanban if you never use it. Hide the matrix. Show only what you'll actually look at
- **Settings live in the page now**, not buried two menus deep. Open tasks, click the gear, change what you see, close it

## Habits got the same treatment

Three views, pick what fits.

- **Today** — only the habits due right now, ordered by what you haven't done yet
- **List** — the classic row view with streaks and last-completed info
- **Heatmap** — a GitHub-contributions-style grid of your year. Honestly addictive to look at

Each view is a tab you can hide if you don't want it.

## Guilds have a face now

Last week guilds got campaigns and tiers — the mechanical layer. This week they got identity.

- **Guild lore.** A rich-text block where the owner writes whatever the guild is about. Rules, vibe, a stupid origin story. HTML is capped so nobody breaks the page with a 200KB essay
- **Member titles.** Officers can hand out custom titles to members. "Demon Slayer", "Resident Procrastinator", whatever. Shows next to the name in the member list
- **Tier badges.** Each guild tier now has a visible badge — small, but it's the kind of thing that turns "I'm in a guild" into "I'm in _that_ guild"

Also: the chat room code is now shared between the Tavern and guild chats, and guild messages can be reported. Moderation has to exist before it's needed.

## Onboarding got a real queue

The tutorial used to be a single popup at the start. Helpful for ten seconds. Useless after that.

Now it's a queue. Each major page (tasks, habits, objectives, quests) has its own tutorial slide that fires the first time you visit. You get the right explanation at the right moment instead of one giant info dump on day one.

There's also a **first-quest checklist** that gently nudges new players through "create a task → complete it → start your first quest → win a fight." Small steps, visible progress.

## Polish that adds up

- **Collapsible sidebar sections** with persisted state. If you never use the calendar link, fold that section closed and it stays closed
- **Sitemap, robots.txt, and per-page SEO metadata**. Boring infra, but now Google can actually find the public pages
- **PII scrubbing on Sentry**. Error reports no longer carry email addresses or anything else that shouldn't leave the box
- **Auth forms validate onTouched** instead of yelling at you the second the page renders
- **RPG body font** in the shop and inventory filters — small consistency thing, but the old default font kept making me think the page hadn't loaded yet
- **Dropped `user.name`** entirely. Your character name _is_ your name in Covenant. One source of truth, less to keep in sync

## What's next

More guild stuff (player-created campaigns is still the dream), and continuing to chip at the home page until it's the thing you check before your email. ( • ᴗ - ) ✧
