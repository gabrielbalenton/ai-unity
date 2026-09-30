# UNITY repository security baseline

This is the minimum GitHub security posture before connecting Vercel, cloud data, private repositories or external credentials.

## Threat model

The repository being public is not the primary ransomware risk. The larger risks are:
- stolen GitHub credentials or session tokens;
- overpowered personal access tokens, OAuth apps or GitHub Apps;
- secrets committed into Git history;
- force-push or branch deletion by a compromised privileged identity;
- malicious or compromised CI dependencies/actions;
- having no independent copy when the primary host or account is unavailable.

A private repository still needs all of these controls.

## Controls implemented in source

- No real secrets in source; .env files are ignored except the placeholder .env.example.
- Repository heuristic secret scan runs in milestone CI.
- Production dependency audit runs in milestone CI.
- GitHub Actions use read-only repository contents permission unless a future job explicitly needs more.
- Security-sensitive paths have CODEOWNERS.
- Vercel preview can run with zero secrets and external execution disabled.
- Recovery-bundle tooling produces a complete Git bundle plus SHA-256 checksum.
- Security and incident rules are documented in SECURITY.md.

## GitHub account controls the owner must enable

1. 2FA: keep GitHub 2FA enabled. Prefer a TOTP authenticator and add a passkey or security key plus securely stored recovery codes.
2. Session/app review: periodically review signed-in sessions, authorized OAuth apps, GitHub Apps, SSH keys and PATs; revoke anything unused.
3. Tokens: prefer fine-grained, short-lived tokens with one repository and minimum permissions. Avoid classic PATs for UNITY.
4. Push protection: keep personal push protection enabled. For this public repository, GitHub secret scanning is available; enable repository push protection/Secret Protection controls where the UI offers them.
5. Main ruleset: create an active branch ruleset targeting the default branch with:
   - require a pull request before merge;
   - require the UNITY verification status check once the final workflow/check name is stable;
   - block force pushes;
   - block branch deletion;
   - require conversation resolution;
   - require CODEOWNERS review when collaboration begins;
   - no broad permanent bypass list.
6. Actions: allow only actions you intentionally use. Keep the default workflow token read-only unless a narrowly scoped job needs more.
7. Vercel: connect through the Vercel Git integration rather than pasting a broad GitHub PAT into environment variables.

At the time this document was written, the GitHub API visible to the connected development tool reported no repository rulesets configured. Branch protection could not be read because the development integration lacks repository administration permission. Verify the final setting directly in GitHub before deployment.

## Independent recovery

A GitHub-hosted Actions artifact is useful for CI diagnostics but is not an independent disaster-recovery backup because it depends on the same account and platform.

Before production:
- maintain at least one encrypted backup or mirror outside the primary GitHub account;
- protect its credentials separately from GitHub;
- test restoration into a disposable repository;
- record the checksum of each release backup;
- keep database and file backups independent of the source-code backup.

Run locally:

    bash scripts/create-recovery-bundle.sh

It creates a .bundle containing all local Git refs and a .sha256 checksum under recovery/. The recovery directory is ignored by Git. Copy the resulting files to an encrypted external location you control. A bundle only includes commits and refs present in the local clone, so fetch remote refs before creating a release backup.

Verification example:

    shasum -a 256 -c recovery/<bundle>.sha256
    git bundle verify recovery/<bundle>.bundle

A production recovery exercise must prove a clean clone can be created from the independent bundle without relying on GitHub.

## Never rely on one control

Branch rules do not protect a stolen owner account by themselves. Encryption does not protect a live decrypted session by itself. A private repo does not replace backups. UNITY uses defense in depth: identity security, least privilege, guarded changes, secret prevention and independent recovery.
