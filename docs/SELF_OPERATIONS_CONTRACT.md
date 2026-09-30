# UNITY self-operations incident intelligence: offline contract

UNITY can eventually monitor and maintain its own systems, but it must **not** become an uncontrolled self-modifying production administrator. The first foundation separates observed evidence, independent verification and exact owner authorization.

The offline lifecycle is:
1. Observe a sanitized failure with a project, subsystem and structural fingerprint.
2. Diagnose the actual root cause using bounded evidence references.
3. Propose a repair linked to an isolated change/branch, with declared risk.
4. Require independently recorded test evidence from a different verifier.
5. Request explicit review approval; capture its exact scope and expiry.
6. Hand off to a future separate, authenticated deployment gateway. This contract has **no deploy or execute capability**.
7. Preserve verified incident knowledge for future investigation, but never automatically replay an old fix just because symptoms match.

A future live system must add authenticated actor and project identity, trusted evidence verification, safe observability ingestion, redacted logs, confidential workspace isolation, genuine approval records, transaction-safe revisions, recovery/rollback gates and emergency stop. Webpages, model outputs and logs are untrusted input; they cannot authorize new privileges or repairs.

A recurring issue's fingerprint only retrieves candidate prior investigations. Similar symptoms may have different root causes after upgrades. Previously approved repairs are not blanket approval to repeat them.

The user-facing UI should show ordinary language: "UNITY noticed a problem", "Cause under investigation", "Proposed fix", "Tests passed", "Approval needed". Debugging machinery stays behind progressive disclosure. No fictitious uptime, automation, self-awareness or live diagnostic capability is implied by this offline module.

**Production safety rule:** start with observation and recommendations; enable isolated automated repair only for narrow demonstrated classes of low-risk failures with independent verification, explicit operational policy, reliable rollback and separate deployment permission. Never allow unreviewed production schema, secrets, billing, account permissions or destructive changes.
