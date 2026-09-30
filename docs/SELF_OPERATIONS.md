# UNITY Self-Operations: Incident Intelligence (offline contract)

UNITY itself can be a project, but it must not turn error-log text, external websites or its own model-generated suggestions into permissions to change production.

## Implemented in source

- Structured, bounded incident observations with deterministic symptom fingerprints and sanitized summaries.
- Explicit progression through observed, triaged, reproduced, repair proposed, independently verified in isolation, approval pending, and closed.
- Optimistic revisions reject stale concurrent incident updates.
- Similar previous incidents provide evidence-backed investigative hints within the exact project and component. Similarity is not proof of the same root cause.
- Fix proposals and independent verification can be recorded. This module cannot call models, run commands, alter repositories, deploy, access secrets or bypass emergency stop.
- The actual execution policy remains a separate authenticated service and is not authorized by this offline helper.

## Intended future implementation

1. Trusted monitoring collectors produce redacted observations. Logs, tickets and web content are untrusted data.
2. Incident ingest authenticates tenant/project/component scope, verifies evidence references and persistently records immutable audit records.
3. A sandbox reproduces the incident without access to live client credentials.
4. A specialist may propose a branch/test change within explicitly approved repository scope.
5. A distinct verifier independently tests the reproduced failure and repair.
6. A separate deployment controller enforces owner-approved policy, rollout limits, emergency stop and rollback.
7. Incidents are updated with outcome evidence, environment and regression checks. A recurrence may reference previous incidents but must be diagnosed again.

## Activation blockers

- Trusted per-project identity and role-enforced storage.
- Tamper-resistant evidence store and redacted observability.
- Disposable sandbox workers with tightly scoped permissions and no production secrets.
- An authenticated human approval model and separate deployment authorization.
- Real rollbacks, recovery drills and independent integration tests.

Do not describe this as an autonomous self-healing system until those gates are independently verified.

## Offline project health assessment

The `lib/self-ops/health.mjs` module accepts bounded, minimal observations from an **already trusted** collector and an explicit list of components expected within one project. It never performs network checks itself.

- A present, recent and valid success receipt can support a healthy claim for **that exact component only**.
- A missing, stale or future-dated receipt is **unknown**, not healthy. A project with unknown components is incomplete unless an observed component is down, in which case its overall state is down.
- Same-timestamp contradictory readings fail closed. The latest earlier reading wins.
- Only project-authorized components appear in the result. A live implementation must authenticate worker identity, project mapping, evidence references and collector authorization independently.
- Suggestions are review-required classifications, not commands. The offline contract cannot repair, send email, write code, access secrets or deploy.

Future verified collectors should publish structured signed or otherwise tamper-resistant receipts. Their absence must never be transformed into optimistic summaries such as “all services healthy.” This pure module establishes truthful semantics and tests only; it is **not a deployed monitoring system**.

## Health-to-incident handoff (offline contract)

The pure `planHealthTriage` helper translates the **already scoped and authenticated** health assessment into review-only plans:

- A missing or stale monitor produces **verify monitoring**, not a fabricated outage.
- A current evidenced down/degraded signal proposes incident triage; it does not claim a cause or attempt repair.
- If an active incident already exists for the same project/component, the plan references it rather than creating another incident.
- An unrelated project's incident can never suppress this project's investigation.
- A previous **closed** incident is not standing permission to repeat a fix. A fresh symptom needs fresh reproduction and verification.

A future authenticated incident-creation service must separately enforce collector/project identity, deduplication with atomic DB constraints, approved incident writes, durable audit and provenance. The offline planner has no network, repository or deployment permissions.
