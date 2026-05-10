# Summarize Changes

Analyze the current git changes, propose a conventional-commits message, get user confirmation, then commit.

## Instructions

1. Run `git status --short` to see staged, unstaged, and untracked files
2. Run `git diff HEAD` to review changes
3. Read key changed files if scope unclear
4. Draft a single-line commit message following Conventional Commits:
   - `feat:` new features
   - `fix:` bug fixes
   - `refactor:` code restructuring
   - `docs:` documentation
   - `chore:` maintenance
   - `test:` tests
   - `style:` formatting
5. Show the proposed message to the user and ask for confirmation (or edits)
6. After user approves:
   - Stage relevant files with `git add <paths>` (avoid `git add -A` / `git add .` to skip secrets and unintended files)
   - Do NOT stage files that may contain secrets (`.env`, credentials, keys)
   - Run `git commit -m "<approved message>"` using a HEREDOC to preserve formatting
7. Run `git status` after the commit to confirm success
8. If a pre-commit hook fails, fix the underlying issue, re-stage, and create a NEW commit (do not `--amend`)

## Rules

- Always create a single commit, even when the changes span multiple concerns or file types — do not split into multiple commits
- Never push unless the user explicitly asks
- Never use `--no-verify` or skip hooks
- Keep the subject ≤72 chars, imperative mood, lowercase after the type
- Add a body only when the "why" isn't obvious from the subject
- If there are no changes, report that and stop — do not create an empty commit
