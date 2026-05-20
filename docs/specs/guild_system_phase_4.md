# Guild System — Identity + Vocabulary Layer

> **Version**: 0.1 (draft)
> **Status**: Proposed
> **Last Updated**: 2026-05-20
> **Source**: `TODO.md` "Guild system community lore + roleplay surfaces"; builds on Phase 1–3 documented in `docs/product/guild_system.md`.

## Summary

Changes on top of the existing guild infra:

1. Rich-text guild description (replaces 500-char plain field).
2. Officer-managed member-title pool with single-select assignment.
3. `GuildRole` rename: Owner → Guild Master, Officer → Guild Captain, Member → Guild Member.
4. `Guild.tier` 1–5 surfaces as Bronze / Silver / Gold / Diamond / Platinum.

## Non-Goals

- Free-form avatar uploads.
- Guild emblems and banners.
- Guild discovery directory (separate work; cross-linked).
- Description-level reporting / auto-hide.
- Cross-guild surfaces for `GuildMember.title` (profile pages, leaderboards, etc.). Title is intra-guild only.

## Current State

| Layer                 | What exists                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema                | `Guild.description String? @db.VarChar(500)`, `GuildMember.role String @default("MEMBER") @db.VarChar(20)`, `Guild.tier Int @default(1)` (tiers 1–5)                                                                     |
| Code roles            | `GuildRole` enum used at ~14 sites: `OWNER`, `OFFICER`, `MEMBER`                                                                                                                                                         |
| Rich-text infra       | `src/components/ui/tiptap-editor.component.tsx` (StarterKit + Underline + Placeholder, emits HTML via `editor.getHTML()`), already consumed by `src/app/(workspace)/journaling/_components/journal-editor.component.tsx` |
| HTML sanitizer        | `src/shared/lib/sanitize-rich-text.lib.ts` exports `sanitizeRichText` (DOMPurify; allowlist: `p`, `br`, `strong`, `em`, `u`, `h1`, `h2`, `ul`, `ol`, `li`, `blockquote`, `code`, `pre`, `hr`)                            |
| Render pattern        | `src/app/(workspace)/journaling/_components/journal-content.component.tsx` wraps `sanitizeRichText` + `dangerouslySetInnerHTML`                                                                                          |
| Description consumers | Only two: `src/app/(workspace)/guilds/join/[token]/page.tsx:56-57` and the service-layer DTO at `src/server/services/guild.service.ts:288`. No notifications, emails, or search use the field.                           |

## Design

### Schema changes

```prisma
model Guild {
  // ...existing fields
  description     String?  @db.Text          // was: String? @db.VarChar(500). Widened for rich-text lore.
  availableTitles String[] @db.VarChar(32)   // officer-managed pool, max GUILD_TITLE_POOL_MAX_SIZE items
}

model GuildMember {
  // ...existing fields
  title String? @db.VarChar(32)              // single-select from owning guild's availableTitles (denormalized copy)
}
```

`GuildMember.role` column stays `String @default("MEMBER") @db.VarChar(20)`. Default literal `"MEMBER"` is unchanged (see Role rename).

Apply via `pnpm prisma db push` (per project convention: no migration files; schema is the source of truth).

**Backfill required**: none for `description` (existing ≤500-char strings render as plain text inside `<p>` once Tiptap touches them; sanitizer passes plain text through) or `availableTitles` (defaults to `[]`). One SQL backfill needed for `role` — see next section.

### Role rename — DB-value rename, not display-only

`GuildRole` enum constants change in code:

```ts
export const GuildRole = {
  GUILD_MASTER: 'GUILD_MASTER',
  CAPTAIN: 'CAPTAIN',
  MEMBER: 'MEMBER'
} as const
```

After `pnpm prisma db push`, run a one-shot SQL backfill:

```sql
UPDATE guild_members SET role = 'GUILD_MASTER' WHERE role = 'OWNER';
UPDATE guild_members SET role = 'CAPTAIN'      WHERE role = 'OFFICER';
-- existing 'MEMBER' rows already use the target value; no statement needed.
```

Atomic, idempotent (re-running with no `OWNER` rows is a no-op), reversible. Store at `prisma/manual/2026-XX-XX-rename-guild-roles.sql` (or wherever the project's manual-SQL convention lands).

Update every call site of `GuildRole.OWNER` / `.OFFICER` — replaces with `.GUILD_MASTER` / `.CAPTAIN`. `GuildRole.MEMBER` keeps both its key and string value, so existing references are stable. ~14 sites across `guild.service.ts`, `guilds.router.ts`, repositories, and any frontend role-gate component. Find via `rg "GuildRole\.(OWNER|OFFICER)"`. Also update the literal default in `createGuild` and `addMember` paths (`guild.service.ts:93,342`).

i18n labels:

| Key                        | EN           | ES                 |
| -------------------------- | ------------ | ------------------ |
| `guilds.role.guild_master` | Guild Master | Maestro del Gremio |
| `guilds.role.captain`      | Captain      | Capitán            |
| `guilds.role.member`       | Member       | Miembro            |

### Tier labels

Add to `src/shared/constants/guild-progression.constants.ts`:

```ts
export const GUILD_TIER_LABELS = {
  1: 'BRONZE',
  2: 'SILVER',
  3: 'GOLD',
  4: 'DIAMOND',
  5: 'PLATINUM'
} as const

export type GuildTierLabel = (typeof GUILD_TIER_LABELS)[keyof typeof GUILD_TIER_LABELS]

// Tailwind class fragments per tier. Used by the `GuildTierBadge` component.
// `text` for label color, `bg` for chip background, `border` for outline.
export const GUILD_TIER_COLORS: Record<GuildTierLabel, { text: string; bg: string; border: string }> = {
  BRONZE: { text: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-600' }, // bronze / copper
  SILVER: { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-400' }, // grey
  GOLD: { text: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-500' }, // yellow
  DIAMOND: { text: 'text-sky-700', bg: 'bg-sky-100', border: 'border-sky-400' }, // light blue
  PLATINUM: { text: 'text-zinc-700', bg: 'bg-zinc-50', border: 'border-zinc-300' } // pale / near-white
}
```

`Guild.tier` integer column unchanged. Tier thresholds and gold buffs stay numeric-keyed — no behavioral change to progression logic. Only the UI renders the label.

i18n keys: `guilds.tier.bronze`, `guilds.tier.silver`, `guilds.tier.gold`, `guilds.tier.diamond`, `guilds.tier.platinum`.

**New component**: `src/app/(workspace)/guilds/_components/guild-tier-badge.component.tsx` — takes `tier: 1|2|3|4|5`, resolves `GUILD_TIER_LABELS[tier]` for the text and `GUILD_TIER_COLORS[label]` for the chip classes, renders the localized label inside a colored pill (combine `text` + `bg` + `border` fragments).

Render sites to update (find via `rg "tier" src/app/\(workspace\)/guilds/`): guild header, member-list tier rollup, campaign banner, tier-gated store/shop surface — all replace bare `Tier {n}` strings with `<GuildTierBadge tier={guild.tier} />`.

### Length and pool caps

Add to `src/shared/constants/guild.constants.ts` (extend or create):

| Constant                            | Value   | Purpose                                                         |
| ----------------------------------- | ------- | --------------------------------------------------------------- |
| `GUILD_DESCRIPTION_MAX_LENGTH`      | `5000`  | Plain-text length cap (after strip-tags). User-facing limit.    |
| `GUILD_DESCRIPTION_HTML_MAX_LENGTH` | `15000` | Raw HTML cap. Generous over plain cap to allow markup overhead. |
| `GUILD_TITLE_MAX_LENGTH`            | `32`    | Per-title length.                                               |
| `GUILD_TITLE_POOL_MAX_SIZE`         | `20`    | Pool item count per guild.                                      |

### Zod schemas (`src/shared/schemas/guilds.schemas.ts`)

- Update `updateGuildSchema` (or equivalent) — relax `description` cap from 500 to `GUILD_DESCRIPTION_HTML_MAX_LENGTH`.
- `updateTitlePoolSchema`: `{ guildId: uuid, titles: z.array(z.string().trim().min(1).max(32)).max(20).transform(arr => [...new Set(arr)]) }` — dedupe in transform.
- `updateMemberTitleSchema`: `{ guildId: uuid, memberId: uuid, title: z.string().max(32).nullable() }`.

### Service layer (`src/server/services/guild.service.ts`)

Extend existing `updateGuild`:

- After Zod validation, run `sanitizeRichText(input.description)` server-side before persisting. Defense-in-depth alongside render-time sanitize.
- Reject if the post-sanitize plain-text length > `GUILD_DESCRIPTION_MAX_LENGTH`. Strip tags with `replace(/<[^>]*>/g, '')` — same trick used in `journal-editor.component.tsx:62`.

New methods:

- `updateTitlePool(input, userId)` — requires `GUILD_MASTER` or `CAPTAIN`.
  - Apply caps (already in Zod, repeat as defense-in-depth).
  - Compute `removed = currentPool \ newPool`.
  - Atomically: replace `Guild.availableTitles` and set `GuildMember.title = null` for any member whose `title ∈ removed`. Use `prisma.$transaction([...])`.
- `updateMemberTitle(input, userId)` — requires `GUILD_MASTER` or `CAPTAIN`.
  - Load the guild; validate `input.title` is `null` OR ∈ `guild.availableTitles`. Reject out-of-pool strings (prevents crafted-tRPC bypass).
  - Cannot title self (anti-vanity). Cannot retitle another captain or master — reuse the role-guard pattern from `promoteMember` (`guild.service.ts:182-193`).

### Repositories

- `src/server/repositories/guild.repository.ts` — add `updateAvailableTitles(guildId, titles[])`.
- `src/server/repositories/guild-member.repository.ts` — add `updateTitle(memberId, title)` and `clearTitlesInGuild(guildId, titles[])` for the cascade.

### Router (`src/server/routers/guilds.router.ts`)

New procedures (apply existing rate-limit middleware — see `reportMessage` precedent):

| Procedure                  | Permission | Notes                              |
| -------------------------- | ---------- | ---------------------------------- |
| `guilds.updateTitlePool`   | captain+   | Replaces pool atomically; cascades |
| `guilds.updateMemberTitle` | captain+   | Validates against current pool     |

`guilds.updateGuild` (existing) absorbs the description authoring path — no new procedure needed.

### Frontend

**New components** under `src/app/(workspace)/guilds/_components/`:

- `guild-description-editor.component.tsx` — wraps `TiptapEditor`; captain+ only; mutation calls `guilds.updateGuild`. Char counter (plain length / 5000) using `replace(/<[^>]*>/g, '')` pattern.
- `guild-description-view.component.tsx` — clone of `journal-content.component.tsx`; wraps `sanitizeRichText` + `dangerouslySetInnerHTML`.
- `title-pool-editor.component.tsx` — captain+ settings UI; inline add/remove rows; ≤20 items, ≤32 chars each; save calls `guilds.updateTitlePool`.
- `member-title-select.component.tsx` — single-select via `src/components/ui/select.component.tsx`; options = `availableTitles + [unassigned]`; captain+ inline on member row.

**Modified**:

- `src/app/(workspace)/guilds/[guildId]/page.tsx` — render `GuildDescriptionView`; captain+ sees editor toggle.
- Existing edit-description dialog — swap textarea for `TiptapEditor`.
- `src/app/(workspace)/guilds/_components/guild-members-list.component.tsx` (or equivalent) — render `member.title` next to character name; captain+ sees `MemberTitleSelect`. Update role badges to GUILD_MASTER / CAPTAIN / MEMBER labels.
- Guild settings tab — add Title Pool editor section, captain+ only.
- `src/app/(workspace)/guilds/join/[token]/page.tsx:56-57` — swap the plain `<p>{guild.description}</p>` for `GuildDescriptionView`.
- All tier-render sites — replace `Tier {n}` strings with `<GuildTierBadge tier={guild.tier} />` (label localized via `guilds.tier.*`, color from `GUILD_TIER_COLORS`).

### i18n

Per-guild description and title-pool entries stay in the author's language. UI chrome (button labels, error toasts, role badges, tier labels, "unassigned" option) goes through `i18next` JSON files. Net new keys: 3 role labels + 5 tier labels + ~6 strings for description editor / title pool / member title select.

## Acceptance

1. A Guild Captain can write and save a description with bold, italic, headings, and lists via Tiptap. Plain length > 5000 is rejected. Existing ≤500-char descriptions still render correctly.
2. The description renders sanitized — `<script>`, `<img>`, and `<a href="javascript:...">` injected into the raw input do not execute (DOMPurify allowlist).
3. The description appears on `/guilds/[guildId]` (for members) and on `/guilds/join/[token]` (for prospective joiners), both via `GuildDescriptionView`.
4. A Captain can add and remove titles in the pool editor; the pool is capped at 20 items, each ≤32 chars; duplicates are dropped.
5. A Captain can assign a title to a member via single-select of the pool. Out-of-pool strings (via crafted tRPC) are rejected. A Captain cannot title themselves and cannot retitle another Captain or the Master.
6. Removing a title from the pool clears that title from every member currently assigned it (atomic cascade).
7. Member titles appear next to character names inside the owning guild only; they do not appear on profile pages or leaderboards.
8. Role badges across the app render `Guild Master` / `Guild Captain` / `Guild Member` (and Spanish equivalents).
9. Tier labels render as `Bronze` / `Silver` / `Gold` / `Diamond` / `Platinum` everywhere `Guild.tier` is shown, each inside a `GuildTierBadge` chip whose color matches the tier (bronze=amber, silver=grey, gold=yellow, diamond=sky-blue, platinum=pale-zinc).
10. `pnpm test`, `pnpm typecheck`, and `pnpm lint` are clean.

## Verification

1. `pnpm prisma db push` — apply schema (per memory `feedback_prisma_workflow`).
2. Run the role-rename SQL backfill manually; verify with `SELECT DISTINCT role FROM guild_members` (expect only `GUILD_MASTER`, `CAPTAIN`, `MEMBER`).
3. `pnpm typecheck`, `pnpm test`, `pnpm lint` — all clean. New unit tests cover:
   - `updateGuild`: plain-length cap, server-side sanitize, null/empty handling
   - `updateTitlePool`: ≤20 items, ≤32 char per item, dedupe, captain+ gate, cascade-clear of removed titles
   - `updateMemberTitle`: title must be `null` or ∈ pool, self-title block, captain-on-captain block
   - Role-gate tests pass with new GUILD_MASTER / CAPTAIN / MEMBER values
4. Local browser run:
   - Existing guild with a ≤500-char plain description renders unchanged.
   - Guild Master edits the description with formatting → reload → renders sanitized.
   - Pasting `<script>alert(1)</script>` into Tiptap and saving does not execute the script.
   - Captain adds "Quartermaster" and "Scout" to the pool, assigns "Scout" to a member → name + title appear in the members list.
   - Captain removes "Scout" from the pool → the assigned member's title clears automatically.
   - A crafted tRPC call assigning a string outside the pool returns a validation error.
   - Visiting `/guilds/join/[token]` as a non-member shows the formatted description.
   - Role badges across the app read `Guild Master` / `Guild Captain` / `Guild Member`. Tier badges read `Bronze` / `Silver` / `Gold` / `Diamond` / `Platinum` and render in tier-matched colors (visually distinct across all five tiers).

## Cross-references

- `docs/product/guild_system.md` — canonical Phase 1–3 documentation; append Phase 4 section on completion and link back to this spec.
- `docs/specs/freemium_model.md` — guild creation + capacity are premium-gated; identity-layer features (description, titles) are not premium-gated by this spec.
- `docs/specs/warfronts.md` — adjacent identity/lore work at the world-objective layer; same i18n posture (user text doesn't translate).
- `prisma/schema.prisma` — `Guild`, `GuildMember`, `GuildMessageReport` models.
- `src/components/ui/tiptap-editor.component.tsx` — rich-text input, reused.
- `src/shared/lib/sanitize-rich-text.lib.ts` — `sanitizeRichText`, reused.
- `src/app/(workspace)/journaling/_components/journal-editor.component.tsx`, `.../journal-content.component.tsx` — pattern source.
