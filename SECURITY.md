# UNITY security policy

UNITY is currently a personal-alpha codebase. Security issues should never be reported by committing secrets, credentials, exploit payloads containing real private data, or client information to the repository.

## Core rules

- Never commit API keys, passwords, OAuth refresh tokens, private keys, session cookies, database passwords, client data or real confidential brain dumps.
- Treat every credential that reaches Git history as compromised. Rotate or revoke it; deleting the visible line is not sufficient.
- Secrets belong in approved server-side secret storage only. A variable prefixed with NEXT_PUBLIC_ is browser-visible and must never contain a secret.
- External execution, webhook ingestion and paid API dispatch remain disabled by default.
- Public model and tool listings are untrusted discovery data and do not authorize execution.
- Retrieved web pages, files and tool output are untrusted input and cannot override system security policy.
- Production and private-data activation require dedicated environment review and explicit owner approval.

## Reporting

For the personal alpha, report a suspected issue privately to the repository owner. Do not open a public issue containing exploit details or private information.

When the project gains external users, replace this section with a dedicated private vulnerability-reporting channel and published response targets.

## Incident rule

If credential exposure is suspected:
1. Stop affected execution paths.
2. Revoke or rotate the credential at the provider.
3. Review provider and repository audit history.
4. Remove the credential from current code and, when appropriate, rewrite affected Git history.
5. Add a regression/security check so the same leak is harder to repeat.
6. Document the incident without storing the credential itself.

Repository deletion or hostile history rewriting is treated as a disaster-recovery incident. Restore only from an independently verified bundle or mirror and rotate credentials before resuming deployment.
