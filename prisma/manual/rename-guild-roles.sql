-- One-shot backfill for Phase 4 GuildRole rename.
-- Atomic, idempotent (no-op when no OWNER/OFFICER rows remain), reversible.
-- Run once after `pnpm prisma db push` lands the schema changes.
UPDATE guild_members SET role = 'GUILD_MASTER' WHERE role = 'OWNER';
UPDATE guild_members SET role = 'CAPTAIN'      WHERE role = 'OFFICER';
-- 'MEMBER' rows already use the target value.
