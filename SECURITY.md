# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Covenant, please report it privately rather than opening a public issue.

**Preferred channel:** [GitHub Security Advisories](https://github.com/<owner>/covenant/security/advisories/new) — opens a private thread with the maintainers.

**Alternative:** email the maintainers using the addresses listed on their public GitHub profiles, with a subject line starting `[covenant security]`.

When reporting, please include:

- A description of the issue and its impact
- Steps to reproduce (proof-of-concept code or HTTP requests if applicable)
- Affected versions, commit SHAs, or deployed URLs
- Any suggested mitigations

We will acknowledge receipt within 7 days and aim to provide an initial assessment within 14 days. Fixes for high-severity issues are prioritized; we will coordinate disclosure timing with the reporter.

## Scope

In scope:

- The Covenant web application and its API
- Authentication, authorization, and session management
- Database queries (SQL injection, IDOR, etc.)
- Rate limiting and account lockout
- Dependencies bundled into the production build

Out of scope:

- Third-party services (Brevo, Sentry, Upstash, Google OAuth) — report directly to those providers
- Self-hosted forks that have diverged from `main`
- Findings that require physical access to a user's device
- Social engineering of maintainers or contributors

## Acknowledgment

We maintain a public record of resolved security issues in [`docs/issues/`](docs/issues/). With your permission, we will credit you in the corresponding postmortem. If you prefer to remain anonymous, we will honor that.

These postmortems are intentionally public — they describe vulnerabilities that have been **fixed and disclosed**, never live issues.

## Supported Versions

Only the latest `main` branch is supported. We do not backport fixes to older releases.
