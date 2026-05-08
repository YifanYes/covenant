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

This ordering ensures that the freshly-recreated guides (`docs/guides/*.md`) and edits to `next.config.ts` exist *only* in the rewritten history, never in a state that the filter-repo invocation could partially capture or miss.

---

## Phase 1 — Git History Sanitization (Destructive)

Use **git-filter-repo** to permanently strip deleted directories and files that contain infrastructure identifiers and personal information from all commits.

> **Run this on a fresh clone**, not your working repo. `git-filter-repo` refuses to operate on a clone with a remote, stash, or reflog by default; running it on your day-to-day clone will either error or (with `--force`) destroy local state. The recommended workflow:
>
> ```bash
> git clone --no-local /path/to/covenant /tmp/covenant-rewrite
> cd /tmp/covenant-rewrite
> # … run filter-repo here, then push back to origin
> ```

### History Rewrite Targets

| Path | Reason | Action |
|---|---|---|
| `bruno/ARQ/environments/yifan.bru` | Contains real email (`yifanyemontpe@gmail.com`) and local test UUIDs | Strip entire file from history |
| `bruno/ARQ/` (entire directory) | Obsolete API client configs from private dev workflow | Strip entire directory |
| `aws/` (entire directory) | Contains CDK stacks with SSM parameter paths (`/arq/prod/secrets`), old project name | Strip entire directory |
| `docs/guides/railway_deployment.md` (historical versions) | Old guide references `arq-game.com`, `api.arq-game.com`, Railway subdomains | Strip file (will be recreated fresh) |
| `docs/guides/email_brevo_setup.md` (historical versions) | Contains `xkeysib-...` placeholder that looks like a real API key format | Strip file (will be recreated fresh) |
| `docs/guides/sentry_setup.md` (historical versions) | References `covenant-06` org slug | Strip file (will be recreated fresh) |
| Commit author `syrewolfdigital@gmail.com` | Personal email in history | Rewrite to `denis@noreply.covenantrpg.com` |
| Commit author `yifanyemontpe@gmail.com` | Personal email in history | Rewrite to `yifan@noreply.covenantrpg.com` |
| Commit author `yifan.ye@signe.es` | Employer email in history | Rewrite to `yifan@noreply.covenantrpg.com` |
| Commit author `t3code@users.noreply.github.com` | Tooling-bot identity attributable to Yifan | Rewrite to `yifan@noreply.covenantrpg.com` |

### Verify all author/committer identities are covered

Before running the rewrite, list every identity in history and confirm each is mapped:

```bash
git log --all --pretty=format:'%an <%ae>%n%cn <%ce>' | sort -u
```

Every line that returns must be either (a) a `noreply.covenantrpg.com` placeholder already, or (b) covered by an entry in `mailmap.txt`.

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

### Post-Rewrite Cleanup

1. Force-push to origin (all branches): `git push origin --force --all`
2. Force-push tags: `git push origin --force --tags`
3. Delete local clone of any collaborators and re-clone fresh
4. Verify no sensitive paths remain in history:
   ```bash
   git log --all --full-history --source -- bruno/ aws/ docs/guides/railway_deployment.md docs/guides/email_brevo_setup.md docs/guides/sentry_setup.md
   ```
   This must return nothing.

---

## Phase 2 — Current Code Sanitization

Sanitize the working tree to remove PII, dead-domain references, and infrastructure identifiers.

### 2.1 Domain Migration: `arq-game.com` → `covenantrpg.com`

| File | Change |
|---|---|
| `README.md` | Update any old domain references to `covenantrpg.com`; remove the `(card)/ — Character card pages` line from the project structure tree (route is being deleted in 2.2). |
| `docs/lore/` | Search for `arq-game.com` or `arq` branding; update if found |

### 2.2 Remove `/card` Route and Developer PII Entirely

| File | Action |
|---|---|
| `src/app/(card)/` (entire directory) | **Delete** — remove the entire route group (contains `card-data.ts` with personal LinkedIn/GitHub/X handles and emails) |
| `public/assets/team/` (entire directory) | **Delete** — remove `denis.jpg`, `yifan.jpg` |
| `public/locales/en/translation.json` | **Delete** all `card.*` keys (`card.denis.*`, `card.yifan.*`, `card.links.*`) |
| `public/locales/es/translation.json` | **Delete** all `card.*` keys |
| `docs/lore/Mecanicas/Yifan.md` | **Delete** — character-sheet template that uses the maintainer's first name as the example character; rename or remove rather than ship |

### 2.3 Audit other lore and root docs for personal references

These files were not flagged in the initial audit but should be skimmed before publication:

```bash
grep -rni 'denis\|yifan\|signe\.es\|syrewolf\|@gmail' docs/lore/ mission.md roadmap.md AGENTS.md CLAUDE.md
```

Review each match and decide: keep (legitimate lore), rename (e.g., generic placeholder name), or remove. `mission.md` and `roadmap.md` are in Spanish — that is acceptable for a public repo, but verify they contain no internal infra references (Supabase project IDs, Railway environment names, etc.).

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

If both return clean, leave them tracked. The local-only `.claude/settings.local.json` is handled in Phase 5.

### 2.6 Infrastructure Identifiers

| File | Change |
|---|---|
| `next.config.ts` line 40 | Change fallback Sentry org from `'covenant-06'` to `''` (empty string). The Sentry org must only come from env. |

### 2.7 Recreate Guides Fresh (Generic Placeholders)

| File | Action |
|---|---|
| `docs/guides/railway_deployment.md` | Recreate with generic placeholders (`your-app.railway.app`, `<your-domain>`). No references to old domains. |
| `docs/guides/email_brevo_setup.md` | Recreate with `<your-brevo-api-key>` placeholder. No `xkeysib-...` examples. |
| `docs/guides/sentry_setup.md` | Recreate with `<your-org>` and `<your-project>` placeholders. No hardcoded org slugs. |

---

## Phase 3 — Open Source Essentials

### License

Add `LICENSE` file at root containing **AGPL-3.0** full text.

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

1. **Make repository public** in GitHub settings
2. **Enable security features:**
   - Dependabot alerts
   - Secret scanning (GitHub will scan for accidental future commits)
   - Code scanning (optional, via GitHub Actions)
3. **Update repository metadata:**
   - Description: "Gamified productivity platform with RPG-style progression"
   - Topics: `nextjs`, `trpc`, `prisma`, `postgresql`, `gamification`, `productivity`, `rpg`
   - Website: `https://covenantrpg.com`
4. **Protect `main` branch:**
   - Require PR reviews
   - Require status check `validate` (the single job in `.github/workflows/pr.yml` — runs lint, tsc, build, and tests in sequence). If the workflow is later split into multiple jobs, update the required-checks list accordingly.
   - Require up-to-date branch before merging
5. **Add repository secrets** (for CI/CD):
   - `SENTRY_AUTH_TOKEN` (for source map uploads in PR workflow)
   - `RAILWAY_TOKEN` (if deploying via GitHub Actions)

---

## Phase 5 — Environment Hardening (Local Only)

### 5.1 Rotate every secret BEFORE going public

Every secret currently in any developer's `.env.local`, `.env.prod`, or `.env.sentry-build-plugin` must be assumed compromised the moment the repo goes public — even if the file itself was never committed. Any prior collaborator, contractor, or backup snapshot may retain the value, and once the repo is public the threat surface widens immediately.

**Hard prerequisite:** Rotate the following before flipping the visibility switch in Phase 4:

| Secret | Where to rotate |
|---|---|
| `SENTRY_AUTH_TOKEN` (in `.env.sentry-build-plugin`) | Sentry → Settings → Auth Tokens — revoke + reissue |
| `BREVO_API_KEY` | Brevo dashboard → SMTP & API → API Keys |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → database → Reset REST token |
| `JWT_SECRET` | Regenerate locally (`openssl rand -base64 64`); will invalidate active sessions |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials → Reset secret |
| `DATABASE_URL` / `DIRECT_URL` (production credentials) | Rotate via Railway/Postgres provider — change DB password |

After rotation, redistribute new values to active collaborators via a secure channel (1Password, Bitwarden, etc. — not Slack/Discord).

### 5.2 Local files that must never be committed

Verify each is in `.gitignore`:

| File | Status | Action |
|---|---|---|
| `.env.local` | Not tracked | Already in `.gitignore` — verify before first push |
| `.env.sentry-build-plugin` | Already gitignored | **Rotate token (5.1) first, then delete the local file** |
| `.env.prod` | Not tracked | Referenced by `src/server/scripts/db-push-prod.ts` — verify still in `.gitignore` |
| `.claude/settings.local.json` | Not gitignored | Add `.claude/settings.local.json` to `.gitignore` |

---

## Critical Files Summary

| File | Action |
|---|---|
| `LICENSE` | Create (AGPL-3.0) |
| `CONTRIBUTING.md` | Create |
| `SECURITY.md` | Create |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Create |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Create |
| `.github/pull_request_template.md` | Create |
| `README.md` | Edit — remove `(card)/` line from project structure tree; replace any old domain references |
| `next.config.ts` | Edit — remove hardcoded `'covenant-06'` fallback |
| `src/app/(card)/` | Delete — entire route group |
| `public/assets/team/` | Delete — entire directory |
| `public/locales/en/translation.json` | Edit — delete all `card.*` keys |
| `public/locales/es/translation.json` | Edit — delete all `card.*` keys |
| `docs/lore/Mecanicas/Yifan.md` | Delete |
| `docs/guides/railway_deployment.md` | Recreate fresh with generic placeholders |
| `docs/guides/email_brevo_setup.md` | Recreate fresh with generic placeholders |
| `docs/guides/sentry_setup.md` | Recreate fresh with generic placeholders |
| `.env.sentry-build-plugin` | Rotate `SENTRY_AUTH_TOKEN` (Phase 5.1), then delete file from disk |
| `.gitignore` | Add `.claude/settings.local.json` |
| All production secrets | Rotate per Phase 5.1 table before flipping repo to public |

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
5. `git log --all --full-history --source -- bruno/ aws/ docs/guides/railway_deployment.md docs/guides/email_brevo_setup.md docs/guides/sentry_setup.md` — returns nothing (files purged)
6. `git log --all --pretty=format:'%an <%ae>%n%cn <%ce>' | sort -u` — every line is either a `noreply.covenantrpg.com` placeholder or an explicitly-allowed identity (no `@gmail.com`, no `@signe.es`, no original `t3code` bot)
7. `grep -ri 'arq-game' src/ docs/ public/ README.md` — zero hits
8. `grep -ri 'yifanyemontpe\|syrewolfdigital\|signe\.es\|t3code' .` — zero hits (excluding `.git/`, `node_modules/`, `.next/`)

### Content
9. `grep -ri 'covenant-06' src/ docs/ next.config.ts` — zero hits (Sentry org is env-only)
10. `grep -ri 'denisgudina\|yifan_yz\|subject\.denis' src/ public/` — zero hits (card data removed)
11. `ls public/assets/team/` — directory does not exist
12. `ls 'src/app/(card)/'` — directory does not exist

### Secrets
13. `git ls-files | grep -E '(^|/)\.env'` — only `.env.example` should appear
14. Run ripgrep with explicit per-extension globs (note: `--include='*.{a,b}'` is **grep** syntax, not ripgrep, and won't expand inside ripgrep):

    ```bash
    rg -nE '(sk-|api_key|password|secret|token|private_key|sntrys_|xkeysib-)' \
       -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '*.json' -g '*.md' \
       src/ docs/ public/
    ```

    Only `process.env.*` references and `<your-…>` documentation placeholders should remain.

---

## Risks & Trade-offs

| Risk | Mitigation |
|---|---|
| `git-filter-repo` rewrites all commit hashes, breaking existing local clones | Force-push, notify any collaborators to re-clone |
| Bruno environment file contained test UUIDs that might match real DB records | These UUIDs were from a local dev DB (not production); risk is minimal |
| AWS CDK stacks contained SSM parameter paths | These were infrastructure code, not secrets; paths are generic |
| Security postmortems reveal past vulnerabilities | Acceptable trade-off for transparency; they are valuable for contributors |
| AGPL-3.0 may deter some corporate adopters | Conscious choice — protects against closed-source hosted forks |

---

## Out of Scope

- Rewriting commit messages that reference personal names or emails in free text (e.g. `feat: combat (#63)` by "Denis"). These are harmless metadata and impractical to scrub exhaustively.
- Removing the `docs/issues/` security postmortems. These are intentional public documentation.
- Changing the `railway.toml` deployment config. It contains no secrets and is generic infrastructure code.
