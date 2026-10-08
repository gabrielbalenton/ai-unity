# UNITY pre-activation security gates

**Current source baseline:** CODEOWNERS, basic secret-pattern checks, read-only GitHub Actions token, reproducible npm lockfile, security policy, recovery-bundle script, zero-secret preview defaults and source-level tests.

These are safeguards, not a claim that production data is protected or backed up.

## GitHub owner-side configuration (verify before connecting secrets)
- [x] Main ruleset exists, targets default branch and is active (checked via GitHub API on September 30, 2026).
- [x] Ruleset forbids deletion and force pushes; pull requests required; bypass list empty.
- [ ] Enable PR conversation resolution.
- [ ] Add `validate` from GitHub Actions as a required check. A rule that says "require checks" but lists zero checks is not enough.
- [ ] Verify the next PR cannot merge while `validate` is failing or pending.
- [ ] Review GitHub account 2FA/passkeys and separately stored recovery codes.
- [ ] Review token/app/SSH-key scopes and enable available secret scanning and push protection controls.
- [ ] Confirm account recovery and email access are independently secured.

## Independent recoverability
- [ ] Create a complete local Git bundle after fetching all needed refs.
- [ ] Verify the bundle and its SHA-256 checksum.
- [ ] Keep an **encrypted** copy outside the primary GitHub account, with separately controlled access.
- [ ] Test restoring the bundle into a disposable local repository.
- [ ] Separately define encrypted database and artifact backup/restoration after those services actually exist.

## Preview boundary
- [ ] Review Product Constitution with owner.
- [ ] Only then connect a restricted Vercel preview to the verified reviewed Git commit.
- [ ] Use zero secrets and leave external execution, webhook ingestion and paid API use disabled.
- [ ] Test real browser interface, local data semantics, security headers, safe empty states and logs.
- [ ] Treat Supabase/Auth, credentials, provider connections and production processing as separate explicitly approved stages.

No automatic admin-level security setting or off-platform encrypted backup has been created by repository documentation.
