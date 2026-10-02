# UNITY private-alpha test and activation gate — October 2, 2026

Owner decision: keep the GitHub repository public for now. Authorize full non-production code, browser and disposable database testing and preparation for a private trial. No paid API calls or services; $0 paid-API default stays enforced. **Do not put client data, access tokens, credentials, personal memory or secrets in this public repository.**

This document describes the **testing request**, not an assertion that any test has passed or that a live service is secure.

## Immediate release-candidate tests

- [ ] Verify the exact current code revision using a non-draft PR titled with `[UI] [DB]` to run the repository's full checks, Chromium visual tests and synthetic two-user PostgreSQL tests.
- [ ] Inspect CI results, screenshot artifacts, dependency audit and any failures; fix a verified issue in an isolated change and re-run once. Do not convert skipped checks into passes.
- [ ] Reconfirm final Light/Dark/System behavior, keyboard navigation, desktop/tablet/mobile layouts, and no fake connected-account, AI execution, uptime or billing claims.
- [ ] Verify GitHub repository protections, secret scanning, history audit and exact dependency lockfile on the final release head.

## Safe private-trial activation sequence

1. Use a **separate UNITY-only** test database and hosting project. Never reuse HAVOC, FPX, Pebble or client resources.
2. Explicitly confirm the Supabase organization and any reported creation cost before creating it. Configure real user authentication, restrictive row-level security, encrypted secret handling and backup/restore. Test two user identities and two isolated projects before accepting real data.
3. Connect one authorized AI provider only after its terms, account permissions and actual free-usage eligibility have been checked. Fail closed on unverified prices or quota and independently verify **$0 paid AI charges** using real provider records.
4. Configure private access protection **before sharing any hosted URL**. A random Vercel preview URL is not privacy protection. Do not expose private APIs or workspace content publicly.
5. Test live end-to-end conversation, saved/revoked memory, denied cross-project access, logout, connector revocation and incident recovery.
6. Require explicit evidence-based owner sign-off for production activation or for importing sensitive client data. An accessible preview is not launch approval.

## Status as of creation

GitHub-first code is present. The most recent PR #46 passed its standard CI checks, but its browser test and disposable DB jobs were not invoked. No dedicated UNITY Supabase or Vercel project or live AI provider connection has been verified. Those remain pending until independently demonstrated.
