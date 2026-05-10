# Open Source Release — Repository Hardening & Public Readiness

## Context

This repository is being transitioned from a private two-person project to a public open-source project. A comprehensive audit identified that **no actual secrets (API keys, passwords, tokens) are committed to git**. However, there is significant **PII in current code** and **historical artifacts in git history** that must be sanitized before public release while preserving the full commit history.

**New canonical domain:** `covenantrpg.com` (replaces `arq-game.com`).  
**License:** AGPL-3.0.  
**Security postmortems:** Remain public (`docs/issues/`).  
**Commit history:** Commit messages, structure, and authorship attribution are preserved via targeted `git-filter-repo` rewrite. **All commit SHAs change** — any external links to specific commits (PRs, issue references, deploy logs) will break.

---

## Execution Order

The phases must run in this order to avoid recreated content being caught in the history rewrite:

1. **Phase 2** — sanitize the working tree, commit on a working branch (`chore/oss-prep`).
2. **Phase 3** — add open-source essentials (LICENSE, CONTRIBUTING, etc.), commit.
3. **Phase 5** — local environment hardening (rotate secrets, delete sensitive local files, update `.gitignore`), commit.
4. Verify the working tree is clean and all in-tree verifications (§ Verification, "Code & Build" + "Content" + "Secrets") pass on the working branch.
5. **Phase 1** — git history rewrite on a fresh clone, then force-push.
6. **Phase 4** — manual GitHub repository settings (post-push).

The recreated guides in Phase 2.7 are written under **new filenames** (e.g. `docs/guides/deployment.md`, not `docs/guides/railway_deployment.md`). This is essential: `git filter-repo --path P --invert-paths` strips path `P` from **every** commit, including new commits on `chore/oss-prep`. If Phase 2.7 reused the original filenames, the rewrite would erase the recreated content too. Renaming sidesteps the conflict — old paths get stripped from history, new paths stay untouched.

---

## Phase 1 — Git History Sanitization (Destructive)

Use **git-filter-repo** to permanently strip deleted directories and files that contain infrastructure identifiers and personal information from all commits.

> **Run this on a fresh clone**, not your working repo. `git-filter-repo` refuses to operate on a clone with a remote, stash, or reflog by default; running it on your day-to-day clone will either error or (with `--force`) destroy local state. The recommended workflow:
>
> ```bash
> # 1. Tag the pre-rewrite tip on your day-to-day repo as a recovery anchor,
> #    and push that tag to a private archive (a private GitHub repo, S3, or
> #    just keep the original local clone untouched until you have verified
> #    the rewrite). All SHAs change after Phase 1 — without this, rollback
> #    is impossible.
> git -C /path/to/covenant tag pre-oss-rewrite
>
> # 2. Make a disposable clone for the rewrite.
> git clone --no-local /path/to/covenant /tmp/covenant-rewrite
> cd /tmp/covenant-rewrite
> # … run filter-repo here.
>
> # 3. filter-repo removes the `origin` remote by default for safety, and the
> #    clone above sets origin to the local source path anyway. Re-add the
> #    real GitHub remote before pushing:
> git remote add origin git@github.com:<owner>/covenant.git
> ```

### History Rewrite Targets

| Path                                                       | Reason                                                                               | Action                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `bruno/ARQ/environments/yifan.bru`                         | Contains real email (`yifanyemontpe@gmail.com`) and local test UUIDs                 | Strip entire file from history                                      |
| `bruno/ARQ/` (entire directory)                            | Obsolete API client configs from private dev workflow                                | Strip entire directory                                              |
| `aws/` (entire directory)                                  | Contains CDK stacks with SSM parameter paths (`/arq/prod/secrets`), old project name | Strip entire directory                                              |
| `docs/guides/railway_deployment.md` (historical versions)  | Old guide references `arq-game.com`, `api.arq-game.com`, Railway subdomains          | Strip file (will be recreated fresh)                                |
| `docs/guides/email_brevo_setup.md` (historical versions)   | Contains `xkeysib-...` placeholder that looks like a real API key format             | Strip file (will be recreated fresh)                                |
| `docs/guides/sentry_setup.md` (historical versions)        | References `covenant-06` org slug                                                    | Strip file (will be recreated fresh)                                |
| Commit author `syrewolfdigital@gmail.com`                  | Personal email in history                                                            | Rewrite to `denis@noreply.covenantrpg.com`                          |
| Commit author `58982694+SyreWolf@users.noreply.github.com` | GitHub-numeric-ID identity attributable to Denis (web edits)                         | Rewrite to `denis@noreply.covenantrpg.com`                          |
| Commit author `yifanyemontpe@gmail.com`                    | Personal email in history                                                            | Rewrite to `yifan@noreply.covenantrpg.com`                          |
| Commit author `yifan.ye@signe.es`                          | Employer email in history                                                            | Rewrite to `yifan@noreply.covenantrpg.com`                          |
| Commit author `t3code@users.noreply.github.com`            | Tooling-bot identity attributable to Yifan                                           | Rewrite to `yifan@noreply.covenantrpg.com`                          |
| Commit committer `GitHub <noreply@github.com>`             | Web-UI commits / merge commits authored via github.com                               | **Allowed as-is** — generic GitHub identity, no PII; do not rewrite |

### Verify all author/committer identities are covered

Before running the rewrite, list every identity in history and confirm each is mapped:

```bash
git log --all --pretty=format:'%an <%ae>%n%cn <%ce>' | sort -u
```

Every line that returns must be either (a) a `noreply.covenantrpg.com` placeholder already, (b) covered by an entry in `mailmap.txt`, or (c) the explicitly-allowed `GitHub <noreply@github.com>` identity (generic web-UI committer — no PII).

Then dry-run the mailmap before the real invocation:

```bash
# In a separate throwaway clone — confirm the rewritten identities look right.
git filter-repo --mailmap /tmp/mailmap.txt --dry-run
```

### Commands

```bash
# 1. Install git-filter-repo
brew install git-filter-repo   # macOS (recommended)
# or: pip install git-filter-repo

# 2. From the fresh clone (see prelude above), with mailmap.txt in /tmp:
git filter-repo \
  --path bruno/ --invert-paths \
  --path aws/ --invert-paths \
  --path docs/guides/railway_deployment.md --invert-paths \
  --path docs/guides/email_brevo_setup.md --invert-paths \
  --path docs/guides/sentry_setup.md --invert-paths \
  --mailmap /tmp/mailmap.txt
```

Where `/tmp/mailmap.txt` contains:

```
Denis Gudiña Nuñez <denis@noreply.covenantrpg.com> Denis Gudiña Nuñez <syrewolfdigital@gmail.com>
Denis Gudiña Nuñez <denis@noreply.covenantrpg.com> Denis Gudiña Nuñez <58982694+SyreWolf@users.noreply.github.com>
Yifan Ye <yifan@noreply.covenantrpg.com> Yifan <yifanyemontpe@gmail.com>
Yifan Ye <yifan@noreply.covenantrpg.com> yifan <yifan.ye@signe.es>
Yifan Ye <yifan@noreply.covenantrpg.com> T3 Code <t3code@users.noreply.github.com>
```

Note: `GitHub <noreply@github.com>` is intentionally absent from the mailmap — it is the generic GitHub web-UI committer and is allowed to remain unchanged.

### Post-Rewrite Cleanup

1. Confirm the GitHub remote was added in the prelude (`git remote -v` should show `git@github.com:<owner>/covenant.git`, **not** the local source path).
2. Force-push to origin (all branches): `git push origin --force --all`
3. Force-push tags: `git push origin --force --tags`
4. Garbage-collect dangling objects in the rewrite clone so unreachable copies of stripped blobs are pruned locally:
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```
   GitHub will retain dangling objects on the server side for at least 90 days. For stronger guarantees, open a GitHub Support ticket requesting purge of unreachable objects after the force-push.
5. Delete local clones held by any collaborators and have them re-clone fresh. Old clones still contain the un-rewritten history.
6. Verify no sensitive paths remain in history:
   ```bash
   git log --all --full-history --source -- bruno/ aws/ docs/guides/railway_deployment.md docs/guides/email_brevo_setup.md docs/guides/sentry_setup.md
   git rev-list --all --objects | grep -E ' (bruno/|aws/|docs/guides/(railway_deployment|email_brevo_setup|sentry_setup)\.md)' || echo OK
   ```
   The first command must return nothing; the second must print `OK`.
7. After Phase 4 verification passes, retire the `pre-oss-rewrite` recovery anchor (delete the tag and the private archive) once you are confident the public state is correct.

---

## Phase 2 — Current Code Sanitization

Sanitize the working tree to remove PII, dead-domain references, and infrastructure identifiers.

### 2.1 Domain Migration: `arq-game.com` → `covenantrpg.com`

| File         | Change                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `README.md`  | Update any old domain references to `covenantrpg.com`; remove the `(card)/ — Character card pages` line from the project structure tree (route is being deleted in 2.2). |
| `docs/lore/` | Search for `arq-game.com` or `arq` branding; update if found                                                                                                             |

### 2.2 Remove `/card` Route and Developer PII Entirely

| File                                     | Action                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(card)/` (entire directory)     | **Delete** — remove the entire route group (contains `card-data.ts` with personal LinkedIn/GitHub/X handles and emails)                 |
| `public/assets/team/` (entire directory) | **Delete** — remove `denis.jpg`, `yifan.jpg`                                                                                            |
| `public/locales/en/translation.json`     | **Delete** all `card.*` keys (`card.denis.*`, `card.yifan.*`, `card.links.*`)                                                           |
| `public/locales/es/translation.json`     | **Delete** all `card.*` keys                                                                                                            |
| `docs/lore/Mecanicas/Yifan.md`           | **Delete** — character-sheet template that uses the maintainer's first name as the example character; rename or remove rather than ship |

### 2.3 Audit other lore, root docs, and guides for personal references

These files were not flagged in the initial audit but should be skimmed before publication:

```bash
grep -rni 'denis\|yifan\|signe\.es\|syrewolf\|@gmail' \
  docs/lore/ docs/guides/redis_setup.md mission.md roadmap.md AGENTS.md CLAUDE.md
```

Review each match and decide: keep (legitimate lore), rename (e.g., generic placeholder name), or remove. `mission.md` and `roadmap.md` are in Spanish — that is acceptable for a public repo, but verify they contain no internal infra references (Supabase project IDs, Railway environment names, etc.).

`docs/guides/redis_setup.md` was previously confirmed clean (no PII, infra IDs, or old domain references) and is **not** stripped in Phase 1; this audit is a final check before publication.

### 2.4 Audit seed and fixture data

```bash
grep -rEni '@(gmail|hotmail|outlook|signe)\.|denis|yifan|syrewolf' prisma/ src/server/__tests__/fixtures/
```

Replace any real names, emails, or production-derived UUIDs with generic test data (`alice@example.com`, fixed UUID literals, etc.).

### 2.5 AI tooling configs (`.claude/`, `.opencode/`)

The repo currently tracks `.claude/commands/*.md` and `.opencode/commands/*.md` (slash-command definitions). These contain no PII and are fine to publish, but confirm before going public:

```bash
git ls-files .claude/ .opencode/
grep -ri 'arq-game\|covenant-06\|signe\|@gmail' .claude/ .opencode/
```

If both return clean, also skim each file for: (a) references to internal-only services or dashboards that won't be useful (or won't be reachable) to public contributors, (b) prompts that assume access to private repos or paid tooling, and (c) any third-party content (copied prompt snippets, command templates) whose original license may conflict with AGPL-3.0. Decide untrack vs publish on a per-file basis.

The local-only `.claude/settings.local.json` is handled in Phase 5.

### 2.6 Infrastructure Identifiers

| File                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next.config.ts` line 44 | Remove the hardcoded `'covenant-06'` fallback for Sentry org. **Do not** replace it with `''` (empty string) — that makes Sentry source-map upload fail silently at build time. Instead, drop the fallback entirely and treat a missing `SENTRY_ORG` as a build-time error in production. Recommended pattern: `org: process.env.SENTRY_ORG ?? (process.env.NODE_ENV === 'production' ? (() => { throw new Error('SENTRY_ORG required in production') })() : undefined)`. In dev, `undefined` causes the Sentry plugin to skip upload, which is correct local behavior. |

Also clean up `.gitignore`: remove the now-stale `**/bruno/ARQ/environments` line — Phase 1 strips `bruno/` from history and Phase 2.2 (implicitly) confirms no `bruno/` directory exists in the working tree, so the ignore line is obsolete documentation.

### 2.7 Recreate Guides Fresh Under New Filenames (Generic Placeholders)

The replacements use **new filenames** so that Phase 1's `--invert-paths` strip targets only the old paths and leaves the recreated content intact. Do **not** reuse the original filenames — the strip would erase them.

| Old path (stripped in Phase 1)      | New path (created here)           | Content                                                                                       |
| ----------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| `docs/guides/railway_deployment.md` | `docs/guides/deployment.md`       | Generic placeholders (`your-app.railway.app`, `<your-domain>`). No references to old domains. |
| `docs/guides/email_brevo_setup.md`  | `docs/guides/email_setup.md`      | `<your-brevo-api-key>` placeholder. No `xkeysib-...` examples.                                |
| `docs/guides/sentry_setup.md`       | `docs/guides/error_monitoring.md` | `<your-org>` and `<your-project>` placeholders. No hardcoded org slugs.                       |

If any other doc, README, or code comment links to the old filenames, update those references in this same commit.

---

## Phase 3 — Open Source Essentials

### License

Add `LICENSE` file at root containing **AGPL-3.0** full text.

**AGPL-3.0 §13 — network-use source disclosure.** AGPL §13 requires that any user who interacts with the software over a network be offered access to the corresponding source code of the running version. Because Covenant is a web app served to end users, this is an active obligation, not a paperwork formality.

Implementation requirements:

- Add a visible "Source" link in the running app's footer (or an `/about` / `/source` page) that points to the public repository. The link must reflect the **deployed commit**, not just the latest `main` — for example, render `process.env.NEXT_PUBLIC_COMMIT_SHA` and link to `https://github.com/<owner>/covenant/tree/<sha>`. Inject the SHA at build time (Railway exposes `RAILWAY_GIT_COMMIT_SHA`; the Next.js build can read `process.env.NEXT_PUBLIC_COMMIT_SHA = process.env.RAILWAY_GIT_COMMIT_SHA` in `next.config.ts`).
- Document this requirement in `CONTRIBUTING.md` so any forked deployment understands it must keep (or replace) the link to remain compliant.
- If you ever apply local patches that are not yet pushed publicly, you must publish the patched source from the same link. Easiest path: never deploy from a private branch.

### Contributing Guidelines

Create `CONTRIBUTING.md` at root:

- Development setup (`pnpm install`, copy `.env.example` → `.env.local`)
- PR workflow (branch from `main`, run `pnpm dry-run`)
- Issue templates (bug report, feature request)
- Code of conduct reference

### Security Policy

Create `SECURITY.md` at root:

- How to report vulnerabilities responsibly
- Scope and acknowledgment policy
- Reference `docs/issues/` postmortems as examples of transparent handling

### GitHub Templates

Create `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`.

Create `.github/pull_request_template.md`:

- Checklist: tests pass, `pnpm dry-run` succeeds, i18n keys added to both locales
- Link to related issue

---

## Phase 4 — Repository Settings (Manual, Post-Push)

1. **Audit closed PRs and issues** before flipping to public. Going public exposes every PR thread, issue comment, and review on github.com — not just the source tree. Skim closed/merged PRs and closed issues for: infra leaks (project IDs, environment names, internal URLs), production data in screenshots or logs, personal references in review comments. Edit or delete anything sensitive **before** step 2.
2. **Make repository public** in GitHub settings.
3. **Enable security features:**
   - Dependabot alerts
   - Secret scanning (GitHub will scan for accidental future commits)
   - Code scanning (optional, via GitHub Actions)
4. **Update repository metadata:**
   - Description: "Gamified productivity platform with RPG-style progression"
   - Topics: `nextjs`, `trpc`, `prisma`, `postgresql`, `gamification`, `productivity`, `rpg`
   - Website: `https://covenantrpg.com`
5. **Protect `main` branch:**
   - Require PR reviews
   - Require status check `validate` (the single job in `.github/workflows/pr.yml` — runs lint, tsc, build, and tests in sequence). If the workflow is later split into multiple jobs, update the required-checks list accordingly.
   - Require up-to-date branch before merging
6. **Add repository secrets** (for CI/CD): `SENTRY_AUTH_TOKEN` only (for source map uploads in PR workflow). Do **not** add `RAILWAY_TOKEN` — there is no GitHub Actions deploy workflow today; deploy is driven by Railway's GitHub app. Add Railway's token only if and when a deploy workflow is introduced.

---

## Phase 5 — Environment Hardening (Local Only)

### 5.1 Rotate every secret BEFORE going public

Every secret currently in any developer's `.env.local`, `.env.prod`, or `.env.sentry-build-plugin` must be assumed compromised the moment the repo goes public — even if the file itself was never committed. Any prior collaborator, contractor, or backup snapshot may retain the value, and once the repo is public the threat surface widens immediately.

If any local development database was seeded from a production dump, treat its credentials as compromised too: rotate the dev DB password and re-seed from a sanitized fixture before flipping public.

**Hard prerequisite:** Rotate the following before flipping the visibility switch in Phase 4. Rotation can happen at any point before the visibility flip — it does not need to precede Phase 1, since the secrets were never committed.

| Secret                                                 | Where to rotate                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_AUTH_TOKEN` (in `.env.sentry-build-plugin`)    | Sentry → Settings → Auth Tokens — revoke + reissue                                                                                                                                                                                                                                                                                                      |
| `BREVO_API_KEY`                                        | Brevo dashboard → SMTP & API → API Keys                                                                                                                                                                                                                                                                                                                 |
| `UPSTASH_REDIS_REST_TOKEN`                             | Upstash console → database → Reset REST token                                                                                                                                                                                                                                                                                                           |
| `JWT_SECRET`                                           | Regenerate locally (`openssl rand -base64 64`). **All active sessions are invalidated** — every user is forcibly logged out. Schedule the rotation during a low-traffic window and post a brief heads-up in any user-facing channel. For the current two-person project the impact is negligible; revisit this guidance once there is a real user base. |
| `GOOGLE_CLIENT_SECRET`                                 | Google Cloud Console → Credentials → Reset secret                                                                                                                                                                                                                                                                                                       |
| `DATABASE_URL` / `DIRECT_URL` (production credentials) | Rotate via Railway/Postgres provider — change DB password                                                                                                                                                                                                                                                                                               |

After rotation, redistribute new values to active collaborators via a secure channel (1Password, Bitwarden, etc. — not Slack/Discord).

### 5.2 Local files that must never be committed

Verify each is in `.gitignore`:

| File                          | Status                       | Action                                                                            |
| ----------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `.env.local`                  | Not tracked                  | Already in `.gitignore` — verify before first push                                |
| `.env.sentry-build-plugin`    | Already gitignored           | **Rotate token (5.1) first, then delete the local file**                          |
| `.env.prod`                   | Not tracked                  | Referenced by `src/server/scripts/db-push-prod.ts` — verify still in `.gitignore` |
| `.claude/settings.local.json` | **Currently tracked** in git | Untrack and ignore (steps below)                                                  |

`.claude/settings.local.json` is in the index right now. Adding it to `.gitignore` alone does **not** untrack a file already in the index — it would continue to be committed on every change. Untrack first, then ignore:

```bash
git rm --cached .claude/settings.local.json
echo '.claude/settings.local.json' >> .gitignore
git commit -m "chore: untrack local Claude settings"
```

Confirm with `git ls-files .claude/` — `settings.local.json` must not appear.

---

## Critical Files Summary

| File                                        | Action                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `LICENSE`                                   | Create (AGPL-3.0)                                                                                                                           |
| `CONTRIBUTING.md`                           | Create — include AGPL §13 source-link requirement                                                                                           |
| `SECURITY.md`                               | Create                                                                                                                                      |
| `.github/ISSUE_TEMPLATE/bug_report.md`      | Create                                                                                                                                      |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Create                                                                                                                                      |
| `.github/pull_request_template.md`          | Create                                                                                                                                      |
| `README.md`                                 | Edit — remove `(card)/` line from project structure tree; replace any old domain references; update any links to renamed guides (Phase 2.7) |
| `next.config.ts`                            | Edit — remove hardcoded `'covenant-06'` fallback (line 44); drop fallback entirely, throw in production if `SENTRY_ORG` missing             |
| App footer / layout                         | Add visible "Source" link to public repo at the deployed commit SHA (AGPL §13 — see Phase 3)                                                |
| `src/app/(card)/`                           | Delete — entire route group                                                                                                                 |
| `public/assets/team/`                       | Delete — entire directory                                                                                                                   |
| `public/locales/en/translation.json`        | Edit — delete all `card.*` keys                                                                                                             |
| `public/locales/es/translation.json`        | Edit — delete all `card.*` keys                                                                                                             |
| `docs/lore/Mecanicas/Yifan.md`              | Delete                                                                                                                                      |
| `docs/guides/railway_deployment.md`         | Strip in Phase 1; recreated as `docs/guides/deployment.md` in Phase 2.7                                                                     |
| `docs/guides/email_brevo_setup.md`          | Strip in Phase 1; recreated as `docs/guides/email_setup.md` in Phase 2.7                                                                    |
| `docs/guides/sentry_setup.md`               | Strip in Phase 1; recreated as `docs/guides/error_monitoring.md` in Phase 2.7                                                               |
| `.claude/settings.local.json`               | `git rm --cached`, then add to `.gitignore` (Phase 5.2)                                                                                     |
| `.env.sentry-build-plugin`                  | Rotate `SENTRY_AUTH_TOKEN` (Phase 5.1), then delete file from disk                                                                          |
| `.gitignore`                                | Add `.claude/settings.local.json`; remove stale `**/bruno/ARQ/environments` line                                                            |
| All production secrets                      | Rotate per Phase 5.1 table before flipping repo to public                                                                                   |

---

## Verification

After all phases are complete.

> **Note:** This spec file (`docs/specs/open_source_release.md`) itself contains every forbidden string used in the verification greps below (it documents what to remove). Either delete this spec from `docs/` once the work is done, or pass `--exclude='open_source_release.md'` to every grep. The commands below assume it has been deleted; adjust if you choose to keep it.

### Code & Build

1. `pnpm lint` — clean
2. `npx tsc --noEmit` — clean
3. `pnpm test:run` — all pass
4. `pnpm build` — clean

### Git History

Run all of these from a **fresh `git clone https://github.com/<owner>/covenant.git`** of the post-push repo, not from the rewrite clone — the freshly-cloned tree confirms what an outside contributor will actually see.

5. `git log --all --full-history --source -- bruno/ aws/ docs/guides/railway_deployment.md docs/guides/email_brevo_setup.md docs/guides/sentry_setup.md` — returns nothing (files purged from history).
6. `git rev-list --all --objects | grep -E ' (bruno/|aws/|docs/guides/(railway_deployment|email_brevo_setup|sentry_setup)\.md)'` — returns nothing (no reachable blobs at the stripped paths).
7. `git log --all --pretty=format:'%an <%ae>%n%cn <%ce>' | sort -u` — every line is either a `noreply.covenantrpg.com` placeholder or one of the explicitly-allowed identities (`GitHub <noreply@github.com>`). No `@gmail.com`, no `@signe.es`, no original `t3code` bot, no numeric-ID GitHub address.
8. `grep -rIi --exclude-dir={.git,node_modules,.next,dist,generated} 'arq-game' .` — zero hits (broad scope; old domain must be gone everywhere, not just `src/docs/public`).
9. `grep -rIi --exclude-dir={.git,node_modules,.next,dist,generated} 'yifanyemontpe\|syrewolfdigital\|signe\.es\|t3code' .` — zero hits.

### Content

10. `grep -ri 'covenant-06' src/ docs/ next.config.ts` — zero hits (Sentry org is env-only).
11. `grep -ri 'denisgudina\|yifan_yz\|subject\.denis' src/ public/` — zero hits (card data removed).
12. `ls public/assets/team/` — directory does not exist.
13. `ls 'src/app/(card)/'` — directory does not exist.
14. `git ls-files .claude/ | grep settings.local` — empty (local Claude settings untracked).

### Secrets

15. `git ls-files | grep -E '(^|/)\.env'` — only `.env.example` should appear.
16. Tightened secret scan — match only value-bearing patterns to avoid false positives on identifier names like `getSessionToken` or `passwordField` (note: `--include='*.{a,b}'` is **grep** syntax, not ripgrep, and won't expand inside ripgrep):

    ```bash
    rg -nE "(sk-[A-Za-z0-9]{20,}|sntrys_[A-Za-z0-9_-]{20,}|xkeysib-[A-Za-z0-9-]{20,}|eyJ[A-Za-z0-9_-]{20,}|['\"][A-Za-z0-9+/=]{40,}['\"])" \
       -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '*.json' -g '*.md' \
       src/ docs/ public/
    ```

    Then a separate allow-list scan to confirm secrets are read via env, never inlined:

    ```bash
    rg -nE '(api_key|secret|token|private_key|password)\s*[:=]\s*["'\''][A-Za-z0-9_-]{16,}' \
       -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '*.json' \
       src/
    ```

    Both must return only `process.env.*` references and `<your-…>` documentation placeholders.

---

## Risks & Trade-offs

| Risk                                                                         | Mitigation                                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `git-filter-repo` rewrites all commit hashes, breaking existing local clones | Force-push, notify any collaborators to re-clone                          |
| Bruno environment file contained test UUIDs that might match real DB records | These UUIDs were from a local dev DB (not production); risk is minimal    |
| AWS CDK stacks contained SSM parameter paths                                 | These were infrastructure code, not secrets; paths are generic            |
| Security postmortems reveal past vulnerabilities                             | Acceptable trade-off for transparency; they are valuable for contributors |
| AGPL-3.0 may deter some corporate adopters                                   | Conscious choice — protects against closed-source hosted forks            |

---

## Out of Scope

- Rewriting commit messages that reference personal names or emails in free text (e.g. `feat: combat (#63)` by "Denis"). These are harmless metadata and impractical to scrub exhaustively.
- Removing the `docs/issues/` security postmortems. These are intentional public documentation.
- Changing the `railway.toml` deployment config. It contains no secrets and is generic infrastructure code.
