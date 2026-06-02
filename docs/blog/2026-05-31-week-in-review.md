---
title: 'A Week in Covenant: Backdated Journals, a Real Profile Page, and a Combat Preview'
date: 2026-05-31
author: Yifan
tags: [release-notes, features]
---

# A Week in Covenant: Backdated Journals, a Real Profile Page, and a Combat Preview

Less of a single big shift this week, more a handful of features that each had a sharp edge I'd been ignoring for too long. Also a confession about the production database near the bottom (◞‸◟).

## The journal remembers what you forgot

The journal shipped assuming you'd write in it the moment something happened. Nobody does that. You remember on Thursday that Tuesday was rough.

- **Backdate entries.** Pick a past day and write into it. Your timeline stays honest instead of pretending everything happened the second you opened the app
- **Infinite scroll** instead of a wall of every entry you've ever written loading at once
- **A per-day mana cap.** Journaling earns mana, and without a cap "write 40 one-word entries" becomes an infinite money printer. Now there's a daily ceiling — reflect because it helps, not because it pays

## A profile page that actually manages your account

Account settings used to be scattered and half-missing. There's now a **dedicated profile page** that does the boring-but-essential things:

- **Change your email**
- **Update your password**
- A **danger zone** for deleting your account — walled off and deliberately ugly, the way danger zones should be

While I was in settings I also added an **unsaved-changes banner** so you stop losing edits by clicking away. Then I shipped it, watched it flash for a split second every single time you hit save, and spent a follow-up commit teaching it the difference between "you have unsaved changes" and "I am, right now, saving them" (•́﹏•̀).

## The landing page throws a punch

The public page was all words. Words don't sell a game where you fight things.

- An **animated combat preview** in the hero — actual combat moving on the front page instead of a screenshot pretending to be a game
- The **coming-soon section got a rewrite** around what's actually next: factions, warfronts, calendar sync. Less vague roadmap, more "here is the thing being built"

## Small things with teeth

- **Combat without a mouse.** Enemy sprites now have proper accessibility labels and keyboard targeting, so you can pick a target and swing with the keyboard. Should've been there from day one
- **You're allowed to quit.** Quests got an abandon action with a confirm dialog. Sometimes you take on a quest and your life changes — pretending you'll finish it forever just rots the list
- **The calendar shows your mood.** Each day tints by how you logged it, so a glance at the month tells you something before you read a word

## Under the hood (one of these is embarrassing)

- **The production database was resetting on every deploy.** Yes. Every deploy. I'd love to tell you this was caught by a test. It was caught by me noticing data was gone. It is now, very firmly, not doing that anymore ( ͡° ͜ʖ ͡°)
- **Analytics, finally.** Wired up PostHog for events and feature flags, including a `loop_closed` activation event so I can actually see whether people complete the core loop instead of guessing. Measure first, then decide what to cut
- **Migrated all IDs from UUIDs to bigints with separate public IDs.** Faster lookups, smaller indexes, and URLs stop leaking internal row counts. Pure plumbing, but the kind you only get to redo cheaply while the table is still small
- **Fixed Google sign-up** dropping brand-new users straight into the app instead of the tutorial — they now get routed through onboarding like everyone else

See you next week, be mischievous ( • ᴗ - ) ✧
