# Versioned knowledge approval contract

Source: `lib/memory/revisions.mjs` (pure, offline). This is the precursor to persistent central memory, **not** a live authenticated backend.

## Behavior
- Each record belongs to exactly one project.
- New or imported records do not become authoritative until reapproved by a verified human.
- Proposed revisions do **not** silently replace the last approved version.
- Revisions are optimistic-concurrency guarded with an expected version.
- An approved revision is traceable to its approving human and recorded timestamp.
- Revocation hides the entire record and prevents new revisions.
- Evidence references are pointers only, not independent proof; live verifiers must check originals.

## Server integration requirements
Before wiring into APIs, the server must verify the acting person's authenticated identity, current project membership, approval rights and request origin. Execute the entire operation within a database transaction, locking the current record revision. Keep revision and audit events append-only. Enforce exactly matching project foreign keys in SQL and test with two unrelated user accounts.

The offline `authenticatedHumanApproval` flag exists to describe the server contract. It is **not** proof of authentication on its own. Never call these functions from a client and claim that they enforce authorization. Database persistence, authenticated approvals and reliable evidence verification remain pending.
