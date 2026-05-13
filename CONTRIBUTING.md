# Contributing to Covenant

Thanks for your interest in contributing. This project is licensed under [AGPL-3.0](LICENSE); contributions are accepted under that same license.

## Development Setup

```bash
git clone https://github.com/<your-username>/covenant.git
cd covenant
pnpm install
cp .env.example .env.local
# Fill in .env.local — see README.md and docs/guides/deployment.md
pnpm db:push
pnpm dev
```

The app is served at <http://localhost:3000>.

## Pull Request Workflow

1. Branch from `main`. Use a descriptive name (`feat/...`, `fix/...`, `docs/...`).
2. Make focused commits. Use [Conventional Commits](https://www.conventionalcommits.org/): `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`.
3. Before pushing, run the same checks as CI:

   ```bash
   pnpm lint
   npx tsc --noEmit
   pnpm test:run
   pnpm build
   ```

   The `pre-push` Husky hook runs these automatically.

4. Open a PR against `main`. Fill out the PR template — it asks for a summary, test plan, and i18n confirmation.
5. CI runs `.github/workflows/pr.yml` (`validate` job: lint + tsc + build + tests). All checks must pass before merge.
6. A maintainer reviews. Squash-merge is preferred.

## Code Conventions

- **Format.** No semicolons, single quotes, no trailing commas, `printWidth: 120`. Enforced by `.prettierrc`.
- **No `any`.** Use `unknown` with type guards.
- **File naming.** kebab-case with suffixes: `.component.tsx`, `.utils.ts`, `.router.ts`, `.store.ts`. Hooks: `use-*.ts`.
- **Imports.** Path aliases only (`@/*`, `@shared/*`, `@ui/*`). No relative imports.
- **i18n.** Never hardcode user-facing strings. Use `useTranslation()`. Add new keys to **both** `public/locales/en/translation.json` and `public/locales/es/translation.json`.
- **Backend layers.** Routers stay thin and delegate to services; services contain business logic; repositories handle data access (no business logic). See `README.md` for details.

## Issue Templates

- **Bug report.** Use the bug template at `.github/ISSUE_TEMPLATE/bug_report.md`. Include reproduction steps, expected vs actual behavior, and environment.
- **Feature request.** Use the feature template. Explain the problem first, then the proposed solution.

## AGPL-3.0 § 13 — Source-Link Requirement

Covenant is licensed under AGPL-3.0. Section 13 of the license requires that any user who interacts with the software over a network be offered access to the corresponding source code of the running version.

If you deploy your own instance or fork:

- The app must display a visible **"Source"** link in the footer (or on an `/about` page) that points to the running source repository at the **deployed commit**.
- The link must reflect the actual deployed SHA, not just the latest `main`. The canonical instance does this by reading `process.env.NEXT_PUBLIC_COMMIT_SHA` (set from `RAILWAY_GIT_COMMIT_SHA` at build time) and linking to `https://github.com/<owner>/covenant/tree/<sha>`.
- If you apply local patches that are not yet pushed publicly, you must publish the patched source from the same link. The simplest path is never to deploy from a private branch.

Removing the Source link from your deployment is a license violation. If you fork, keep the link (pointed at your fork) or replace it with an equivalent disclosure.

## Reporting Security Issues

Do not file public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the disclosure process.

## Code of Conduct

Be respectful. Disagree on ideas, not people. Maintainers may remove comments, commits, or contributors that violate this norm.
