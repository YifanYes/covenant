# Write Weekly News Article

Draft this week's "A Week in Covenant" article, save to `docs/blog/`. Do not touch `src/app/(landing)/news/` — MDX, translations, news index wired up separately.

Pause to confirm before saving if week's theme unclear or zero user-visible changes.

## Pre-flight

1. Date range. Default: last 7 days ending today. Today in conversation context.
2. Run `git log --since="<start-date>" --pretty=format:"%h %s"` to gather commits. Empty → stop, tell user nothing to write.
3. Skim working tree for substantial uncommitted changes (`git status --short`). Flag uncommitted work — don't assume shipped.
4. Group commits by theme (combat, guilds, auth, onboarding, infra, polish, etc.). Skip pure chore/format/dep-bump unless user-visible.
5. Pick 2-3 biggest themes for title. Format: `A Week in Covenant: <Theme A> and <Theme B>` (or three with commas). Concrete — name features, not abstractions.

## Style and tone

Match prior posts in `docs/blog/`. Read latest first if unsure.

- **Voice**: first-person, conversational, funny, energetic, self-deprecating. "I" not "we". Honest about trade-offs and dead ends.
- **Opener**: 1-2 sentences framing week. Not summary — vibe. ("This has been the week I've worked the most on Covenant." / "There were three big shifts this week, plus a stack of smaller ones.")
- **Sections**: one `##` per theme. Short context paragraph, then bullet list of concrete shipped things when it helps. Skip bullets when prose flows better.
- **Reasoning welcome**. Non-obvious decision → one line why. Punchy, never lecture.
- **Personal asides fine**. ASCII emojis like `(⊙＿⊙')` or `( • ᴗ - ) ✧`. Sparingly.
- **No marketing fluff**. No "we're excited to announce" or "stay tuned". State what shipped.
- **No commit SHAs in published article**. Research notes only.
- **Length**: match week. Quiet week → short. Heavy week → long. Don't pad.

AVOID:

- Generic "polish and bug fixes" with no specifics.
- Internal refactors with zero user impact (unless post framed around refactors paying off).
- Future promises beyond brief "what's next" — never overcommit.

## File output

Single file. Nothing else.

- Path: `docs/blog/<YYYY-MM-DD>-week-in-review.md`
- Frontmatter:
  ```yaml
  ---
  title: 'A Week in Covenant: <subtitle>'
  date: <YYYY-MM-DD>
  author: Yifan
  tags: [release-notes, features]
  ---
  ```
  Add `security` or `infra` tags only when warranted.
- Body in English Markdown.

Do not create/edit files in `src/app/(landing)/news/`. Do not touch `posts.ts`. Do not write MDX or Spanish translations — separate step.

## Output

Report back:

- Path of new file.
- Chosen title and themes grouped under.
- Commits left out and why.

Do not commit. Hand draft back for user edit before publishing.
