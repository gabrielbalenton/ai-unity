# UNITY architecture — personal alpha

## Principles
1. The project owns its knowledge; no model owns the memory.
2. Each project has independent authority, evidence, external resources, tasks, and approval settings.
3. Every tool action belongs to a known project, actor, approval, and audit record.
4. Discoverability is not authorization. Catalog entries are not evidence of free access.
5. No production modifications or paid model requests without explicit authorization.
6. Public repository source must contain no credentials or confidential project records.

## Planned system boundaries
- **Web client**: Next.js chat/workspace, project selection, human approval.
- **Identity**: Supabase Auth, with server verification of every request.
- **Knowledge**: PostgreSQL plus pgvector retrieval. Source documents remain authoritative; AI summaries are suggestions.
- **Models**: Pluggable adapters, eligibility checks, quotas, cost guard, and task-compatible fallback.
- **Connectors**: Native adapters, registered MCP servers, REST/OpenAPI adapters, webhooks.
- **Tasks**: Durable workflow execution, scoped agent permissions, verifiable checkpoints.
- **Audit**: Append-only-style event records, source references, proposed changes, execution results.
- **Voice**: Separate optional streaming layer; microphone access requires user consent.
- **Deployments**: Build/test on isolated branches and environments. No automatic production deployment in alpha.

## Phase 0 implemented
Local browser project namespaces, draft/approved brain dumps, JSON export, public catalog discovery.
Important limitations: browser storage is not secure or shared between devices; statuses are local only;
there are no live agent calls, identity verification, GitHub installations, MCP connections, or spend enforcement.
Treat this as an interface prototype. Do not store client secrets or real sensitive information.

## Memory authority
Original live sources and specifically approved instructions are separate authorities. On conflict, block and surface differences rather than choosing silently. Every memory mutation must retain its evidence, author, approval, date, and prior revision. Future agents only receive relevant authorized context.

## First integration gates
Identity and persistent row-level policies must pass isolation tests before external credentials are introduced.
GitHub read-only connector is next, with explicit repository selection. Write operations require scoped review.
No uncontrolled web browsing or untrusted MCP server receives credentials or broad brain access.

## Public repository caveat
The repository is public at the owner's request. Source is public; user data, connected accounts, and operational secrets must not be committed.
